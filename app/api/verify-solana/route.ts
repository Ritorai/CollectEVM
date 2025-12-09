import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { getWassieverseNFTs } from "@/lib/solana";
import { getCache, setCache } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { solAddress, signature, message, messageBytes: messageBytesArray, nonce } = await req.json();

    if (!solAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Use the exact message bytes sent from frontend if available, otherwise encode from string
    const messageBytes = messageBytesArray 
      ? new Uint8Array(messageBytesArray)
      : new TextEncoder().encode(message);

    // 1. Verify nonce exists and hasn't been used
    const nonceRecord = await prisma.nonce.findUnique({
      where: { nonce },
    });

    if (!nonceRecord) {
      return NextResponse.json(
        { error: "Invalid nonce" },
        { status: 400 }
      );
    }

    if (nonceRecord.used) {
      return NextResponse.json(
        { error: "Nonce already used" },
        { status: 400 }
      );
    }

    if (new Date() > nonceRecord.expiresAt) {
      return NextResponse.json(
        { error: "Nonce expired" },
        { status: 400 }
      );
    }

    if (nonceRecord.address !== solAddress) {
      return NextResponse.json(
        { error: "Nonce address mismatch" },
        { status: 400 }
      );
    }

    // 2. Verify Solana signature
    try {
      const publicKey = new PublicKey(solAddress);
      // messageBytes is already set above from the request
      
      // Decode signature - handle different formats
      let signatureBytes: Uint8Array;
      try {
        signatureBytes = bs58.decode(signature);
      } catch (decodeError) {
        console.error("Signature decode error:", decodeError);
        return NextResponse.json(
          { error: "Invalid signature format" },
          { status: 400 }
        );
      }

      // Verify signature length (should be 64 bytes for Ed25519)
      if (signatureBytes.length !== 64) {
        console.error(`Invalid signature length: ${signatureBytes.length}, expected 64`);
        return NextResponse.json(
          { error: "Invalid signature length" },
          { status: 400 }
        );
      }

      // Try multiple verification methods for Ledger compatibility
      // Ledger Solana wallets use Solana's standard off-chain message format
      let verified = false;
      
      // Method 1: Solana's official off-chain message format WITHOUT version byte
      // Format: DOMAIN_SEPARATOR (15 bytes) + MESSAGE_LENGTH (4 bytes LE) + MESSAGE
      // Some wallet adapters use this format (without version byte)
      {
        const DOMAIN_SEPARATOR = new TextEncoder().encode("solana offchain");
        const messageContent = new TextEncoder().encode(message);
        
        // Encode message length as 4-byte little-endian integer
        const messageLength = new Uint8Array(4);
        const len = messageContent.length;
        messageLength[0] = len & 0xff;
        messageLength[1] = (len >> 8) & 0xff;
        messageLength[2] = (len >> 16) & 0xff;
        messageLength[3] = (len >> 24) & 0xff;
        
        // Build the formatted message: DOMAIN + LENGTH + MESSAGE
        const formattedMessage = new Uint8Array(
          DOMAIN_SEPARATOR.length + 
          messageLength.length + 
          messageContent.length
        );
        let offset = 0;
        formattedMessage.set(DOMAIN_SEPARATOR, offset);
        offset += DOMAIN_SEPARATOR.length;
        formattedMessage.set(messageLength, offset);
        offset += messageLength.length;
        formattedMessage.set(messageContent, offset);
        
        verified = nacl.sign.detached.verify(
          formattedMessage,
          signatureBytes,
          publicKey.toBytes()
        );
        
        if (verified) {
          console.log("✅ Ledger signature verified using format: DOMAIN + LENGTH + MESSAGE");
        }
      }
      
      // Method 1b: Solana's official off-chain message format WITH version byte
      // Format: VERSION (1 byte = 0x00) + DOMAIN_SEPARATOR (15 bytes) + MESSAGE_LENGTH (4 bytes LE) + MESSAGE
      if (!verified) {
        const VERSION = new Uint8Array([0]); // Off-chain message version
        const DOMAIN_SEPARATOR = new TextEncoder().encode("solana offchain");
        const messageContent = new TextEncoder().encode(message);
        
        // Encode message length as 4-byte little-endian integer
        const messageLength = new Uint8Array(4);
        const len = messageContent.length;
        messageLength[0] = len & 0xff;
        messageLength[1] = (len >> 8) & 0xff;
        messageLength[2] = (len >> 16) & 0xff;
        messageLength[3] = (len >> 24) & 0xff;
        
        // Build the complete formatted message: VERSION + DOMAIN + LENGTH + MESSAGE
        const formattedMessage = new Uint8Array(
          VERSION.length + 
          DOMAIN_SEPARATOR.length + 
          messageLength.length + 
          messageContent.length
        );
        let offset = 0;
        formattedMessage.set(VERSION, offset);
        offset += VERSION.length;
        formattedMessage.set(DOMAIN_SEPARATOR, offset);
        offset += DOMAIN_SEPARATOR.length;
        formattedMessage.set(messageLength, offset);
        offset += messageLength.length;
        formattedMessage.set(messageContent, offset);
        
        verified = nacl.sign.detached.verify(
          formattedMessage,
          signatureBytes,
          publicKey.toBytes()
        );
        
        if (verified) {
          console.log("✅ Ledger signature verified using format: VERSION + DOMAIN + LENGTH + MESSAGE");
        }
      }
      
      // Method 2: Try using Solana's built-in verify method (if available)
      // Some wallet adapters might use this
      if (!verified) {
        try {
          // Try to use PublicKey's verify method if it exists
          // This is a fallback for wallets that might use different formats
          verified = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKey.toBytes()
          );
          if (verified) {
            console.log("✅ Signature verified using raw message bytes (Method 2)");
          }
        } catch (e) {
          // Ignore and continue to next method
        }
      }
      
      // Method 2b: Try raw message bytes FIRST (Ledger might sign raw bytes directly)
      // This should be tried early since some Ledger implementations sign raw bytes
      if (!verified) {
        verified = nacl.sign.detached.verify(
          messageBytes,
          signatureBytes,
          publicKey.toBytes()
        );
        if (verified) {
          console.log("✅ Signature verified using raw message bytes (Method 2b)");
        }
      }

      // Method 3: Simple domain separator format (DOMAIN + MESSAGE, no length)
      if (!verified) {
        const DOMAIN_SEPARATOR = new TextEncoder().encode("solana offchain");
        const messageContent = new TextEncoder().encode(message);
        
        // Format: domain separator + message (no length field)
        const standardMessage = new Uint8Array(DOMAIN_SEPARATOR.length + messageContent.length);
        standardMessage.set(DOMAIN_SEPARATOR, 0);
        standardMessage.set(messageContent, DOMAIN_SEPARATOR.length);
        
        verified = nacl.sign.detached.verify(
          standardMessage,
          signatureBytes,
          publicKey.toBytes()
        );
        if (verified) {
          console.log("✅ Signature verified using format: DOMAIN + MESSAGE (no length)");
        }
      }
      
      // Method 4: VERSION + DOMAIN + MESSAGE (no length field)
      if (!verified) {
        const VERSION = new Uint8Array([0]);
        const DOMAIN_SEPARATOR = new TextEncoder().encode("solana offchain");
        const messageContent = new TextEncoder().encode(message);
        
        const versionedMessage = new Uint8Array(
          VERSION.length + DOMAIN_SEPARATOR.length + messageContent.length
        );
        let offset = 0;
        versionedMessage.set(VERSION, offset);
        offset += VERSION.length;
        versionedMessage.set(DOMAIN_SEPARATOR, offset);
        offset += DOMAIN_SEPARATOR.length;
        versionedMessage.set(messageContent, offset);
        
        verified = nacl.sign.detached.verify(
          versionedMessage,
          signatureBytes,
          publicKey.toBytes()
        );
        if (verified) {
          console.log("✅ Signature verified using format: VERSION + DOMAIN + MESSAGE (no length)");
        }
      }
      
      // Method 5: DOMAIN + MESSAGE_LENGTH (big-endian) + MESSAGE
      if (!verified) {
        const DOMAIN_SEPARATOR = new TextEncoder().encode("solana offchain");
        const messageContent = new TextEncoder().encode(message);
        
        // Encode message length as 4-byte big-endian integer
        const messageLength = new Uint8Array(4);
        const len = messageContent.length;
        messageLength[0] = (len >> 24) & 0xff;
        messageLength[1] = (len >> 16) & 0xff;
        messageLength[2] = (len >> 8) & 0xff;
        messageLength[3] = len & 0xff;
        
        const formattedMessage = new Uint8Array(
          DOMAIN_SEPARATOR.length + messageLength.length + messageContent.length
        );
        let offset = 0;
        formattedMessage.set(DOMAIN_SEPARATOR, offset);
        offset += DOMAIN_SEPARATOR.length;
        formattedMessage.set(messageLength, offset);
        offset += messageLength.length;
        formattedMessage.set(messageContent, offset);
        
        verified = nacl.sign.detached.verify(
          formattedMessage,
          signatureBytes,
          publicKey.toBytes()
        );
        if (verified) {
          console.log("✅ Signature verified using format: DOMAIN + LENGTH(BE) + MESSAGE");
        }
      }
      
      // Method 6: Try with message as raw Uint8Array (exact bytes sent to signMessage)
      if (!verified) {
        const messageBytesAlt = new Uint8Array(messageBytes);
        verified = nacl.sign.detached.verify(
          messageBytesAlt,
          signatureBytes,
          publicKey.toBytes()
        );
        if (verified) {
          console.log("✅ Signature verified using raw message bytes (Method 6)");
        }
      }

      if (!verified) {
        // Log detailed information for debugging Ledger issues
        console.error("Signature verification failed - all 6 methods attempted", {
          solAddress,
          signatureLength: signatureBytes.length,
          messageLength: messageBytes.length,
          message: message, // Full message for debugging
          messageBytes: Array.from(messageBytes), // All message bytes
          publicKey: publicKey.toString(),
          publicKeyBytes: Array.from(publicKey.toBytes()),
          signatureBase58: bs58.encode(signatureBytes),
          signatureBytes: Array.from(signatureBytes),
          attemptedFormats: [
            "1: DOMAIN + LENGTH(LE) + MESSAGE",
            "1b: VERSION + DOMAIN + LENGTH(LE) + MESSAGE", 
            "2: Raw message bytes",
            "3: DOMAIN + MESSAGE (no length)",
            "4: VERSION + DOMAIN + MESSAGE (no length)",
            "5: DOMAIN + LENGTH(BE) + MESSAGE",
            "6: Raw message bytes (alt)"
          ]
        });
        
        // Return detailed error for Ledger users
        return NextResponse.json(
          { 
            error: "Invalid signature - verification failed. If using Ledger, please ensure: 1) The Solana app is open and unlocked, 2) 'Blind Signing' is enabled in the Solana app settings (Settings → Blind Signing → Enabled), 3) Try disconnecting and reconnecting your Ledger wallet, then verify again." 
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Signature verification error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Provide helpful error message for Ledger users
      if (errorMessage.includes("Invalid") || errorMessage.includes("signature")) {
        return NextResponse.json(
          { error: "Signature verification failed. If using Ledger, ensure the Solana app is open, unlocked, and 'Blind Signing' is enabled in the app settings." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // 3. Mark nonce as used
    await prisma.nonce.update({
      where: { nonce },
      data: { used: true },
    });

    // 4. Query Solana blockchain for Wassieverse NFTs (with Redis caching)
    let nfts: { mintAddress: string; tokenId: string }[] = [];
    try {
      // Check Redis cache first (cache for 5 minutes = 300 seconds)
      const cacheKey = `nfts:${solAddress}`;
      const cachedNFTs = await getCache(cacheKey);
      
      if (cachedNFTs) {
        console.log(`✅ Using cached NFTs for ${solAddress}`);
        nfts = JSON.parse(cachedNFTs);
      } else {
        console.log(`🔍 Fetching NFTs from blockchain for ${solAddress}`);
        nfts = await getWassieverseNFTs(solAddress);
        
        // Cache the result for 5 minutes
        if (nfts.length > 0) {
          await setCache(cacheKey, JSON.stringify(nfts), 300);
        }
      }
      
      if (nfts.length === 0) {
        return NextResponse.json(
          { error: "No Wassieverse NFTs found in this wallet" },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return NextResponse.json(
        { error: "Failed to fetch NFTs from blockchain" },
        { status: 500 }
      );
    }

    // Extract just the token IDs for the response (keeping mint addresses for internal use)
    const tokenIds = nfts.map(nft => nft.tokenId);

    return NextResponse.json({
      verified: true,
      tokenIds,
      nfts, // Include full NFT data for the link-evm route
      message: `Found ${nfts.length} Wassieverse NFT(s)`,
    });
  } catch (error) {
    console.error("Error in verify-solana:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

