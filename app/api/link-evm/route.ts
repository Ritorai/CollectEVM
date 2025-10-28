import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMessage } from "ethers";
import { getWassieverseNFTs } from "@/lib/solana";

export async function POST(req: NextRequest) {
  try {
    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error("JSON parsing error:", jsonError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      solanaAddress,
      evmAddress,
      evmSignature,
      message,
      nonce,
      solanaSignature,
    } = requestData;

    if (
      !solanaAddress ||
      !evmAddress ||
      !evmSignature ||
      !message ||
      !nonce ||
      !solanaSignature
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Verify nonce exists and hasn't been used for EVM linking
    const nonceRecord = await prisma.nonce.findFirst({
      where: {
        nonce,
        address: solanaAddress,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!nonceRecord) {
      return NextResponse.json(
        { error: "Invalid nonce" },
        { status: 400 }
      );
    }

    if (new Date() > nonceRecord.expiresAt) {
      return NextResponse.json(
        { error: "Nonce expired" },
        { status: 400 }
      );
    }

    // 2. Verify EVM signature
    try {
      console.log("Verifying EVM signature:", { message, evmSignature, evmAddress });
      const recoveredAddress = verifyMessage(message, evmSignature);
      console.log("Recovered address:", recoveredAddress);

      if (recoveredAddress.toLowerCase() !== evmAddress.toLowerCase()) {
        console.log("Address mismatch:", { recovered: recoveredAddress, expected: evmAddress });
        return NextResponse.json(
          { error: "Invalid EVM signature" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("EVM signature verification error:", error);
      return NextResponse.json(
        { error: "EVM signature verification failed" },
        { status: 400 }
      );
    }

    // 3. Re-verify Solana NFT ownership server-side
    let nfts: { mintAddress: string; tokenId: string }[] = [];
    try {
      nfts = await getWassieverseNFTs(solanaAddress);

      if (nfts.length === 0) {
        return NextResponse.json(
          { error: "No Wassieverse NFTs found. Ownership may have changed." },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      return NextResponse.json(
        { error: "Failed to verify NFT ownership" },
        { status: 500 }
      );
    }

    // Extract token IDs for database storage
    const tokenIds = nfts.map(nft => nft.tokenId);
    const tokenIdsJson = JSON.stringify(tokenIds);

    // 4. Check for already linked NFTs (prevent double-linking)
    const alreadyLinkedNFTs = await prisma.linkedNFT.findMany({
      where: {
        tokenId: {
          in: tokenIds
        }
      },
      select: {
        tokenId: true,
        solanaAddress: true,
        evmAddress: true
      }
    });

    if (alreadyLinkedNFTs.length > 0) {
      const linkedTokenIds = alreadyLinkedNFTs.map(nft => nft.tokenId);
      console.log(`❌ NFT(s) already linked: ${linkedTokenIds.join(', ')}`);
      
      return NextResponse.json(
        { 
          error: "NFT already linked", 
          details: `Token ID(s) ${linkedTokenIds.join(', ')} are already linked to other wallets`,
          alreadyLinked: linkedTokenIds
        },
        { status: 409 } // Conflict status code
      );
    }

    // 5. Save wallet link to database
    const existingWalletLink = await prisma.walletLink.findUnique({
      where: {
        solanaAddress_evmAddress: {
          solanaAddress,
          evmAddress: evmAddress.toLowerCase(),
        },
      },
    });

    const walletLink = await prisma.walletLink.upsert({
      where: {
        solanaAddress_evmAddress: {
          solanaAddress,
          evmAddress: evmAddress.toLowerCase(),
        },
      },
      update: {
        tokenIds: tokenIdsJson,
        solanaSignature,
        evmSignature,
        updatedAt: new Date(),
      },
      create: {
        solanaAddress,
        evmAddress: evmAddress.toLowerCase(),
        tokenIds: tokenIdsJson,
        solanaSignature,
        evmSignature,
      },
    });

    // 6. Handle LinkedNFT entries
    let linkedNFTs;
    if (existingWalletLink) {
      // Update existing wallet link - add new NFTs to existing ones
      const existingTokenIds = await prisma.linkedNFT.findMany({
        where: { walletLinkId: existingWalletLink.id },
        select: { tokenId: true }
      }).then(nfts => nfts.map(nft => nft.tokenId));

      // Only create entries for new token IDs
      const newNFTs = nfts.filter(nft => !existingTokenIds.includes(nft.tokenId));
      
      if (newNFTs.length > 0) {
        linkedNFTs = await Promise.all(
          newNFTs.map(nft => 
            prisma.linkedNFT.create({
              data: {
                tokenId: nft.tokenId,
                mintAddress: nft.mintAddress,
                solanaAddress,
                evmAddress: evmAddress.toLowerCase(),
                walletLinkId: walletLink.id,
              }
            })
          )
        );
        console.log(`✅ Added ${linkedNFTs.length} new LinkedNFT entries:`, linkedNFTs.map(nft => `Token ID ${nft.tokenId}`));
      } else {
        console.log(`✅ No new NFTs to add - all already linked`);
        linkedNFTs = [];
      }
    } else {
      // Create new wallet link
      linkedNFTs = await Promise.all(
        nfts.map(nft => 
          prisma.linkedNFT.create({
            data: {
              tokenId: nft.tokenId,
              mintAddress: nft.mintAddress,
              solanaAddress,
              evmAddress: evmAddress.toLowerCase(),
              walletLinkId: walletLink.id,
            }
          })
        )
      );
      console.log(`✅ Created ${linkedNFTs.length} LinkedNFT entries:`, linkedNFTs.map(nft => `Token ID ${nft.tokenId}`));
    }

    return NextResponse.json({
      success: true,
      message: "Wallets linked successfully",
      data: {
        solanaAddress: walletLink.solanaAddress,
        evmAddress: walletLink.evmAddress,
        tokenIds: tokenIds, // Return as array for frontend
        verifiedAt: walletLink.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Error in link-evm:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

