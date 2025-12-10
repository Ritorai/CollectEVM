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
      evmSignature, // Optional if EVM address is already linked (locked)
      message,
      nonce, // Optional - no longer required since we removed signature verification
      solanaSignature, // Optional - no longer required since we removed signature verification
      selectedTokenIds, // Optional: if provided, only link these specific tokenIds
      skipEvmSignature, // Flag to skip EVM signature (when EVM is locked but not connected)
    } = requestData;

    if (
      !solanaAddress ||
      !evmAddress
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if EVM address is already linked (has existing WalletLink)
    // If so, we can skip EVM signature requirement
    const existingEvmLink = await prisma.walletLink.findFirst({
      where: {
        evmAddress: evmAddress.toLowerCase(),
      },
    });

    const requiresEvmSignature = !skipEvmSignature && !existingEvmLink;
    
    if (requiresEvmSignature && (!evmSignature || !message)) {
      return NextResponse.json(
        { error: "Missing EVM signature - required for first-time linking" },
        { status: 400 }
      );
    }

    // 1. Verify nonce (only if provided - optional now since we removed signature verification)
    // If nonce is provided, verify it was used (for backward compatibility)
    if (nonce) {
      const nonceRecord = await prisma.nonce.findFirst({
        where: {
          nonce,
          address: solanaAddress,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (nonceRecord) {
        if (new Date() > nonceRecord.expiresAt) {
          return NextResponse.json(
            { error: "Nonce expired" },
            { status: 400 }
          );
        }

        if (!nonceRecord.used) {
          return NextResponse.json(
            { error: "Nonce has not been verified" },
            { status: 400 }
          );
        }
      }
      // If nonce is provided but not found, that's okay - we'll proceed without it
    }

    // 2. Verify EVM signature (only if required)
    if (requiresEvmSignature) {
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
    } else {
      console.log("⏭️ Skipping EVM signature verification - EVM address already linked or locked");
    }

    // 3. Re-verify Solana NFT ownership server-side
    let allNFTs: { mintAddress: string; tokenId: string }[] = [];
    try {
      allNFTs = await getWassieverseNFTs(solanaAddress);

      if (allNFTs.length === 0) {
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

    // 4. Filter to only selected tokenIds if provided, otherwise use all NFTs
    let nfts: { mintAddress: string; tokenId: string }[];
    if (selectedTokenIds && Array.isArray(selectedTokenIds) && selectedTokenIds.length > 0) {
      // Only link the selected tokenIds - verify user owns them
      nfts = allNFTs.filter(nft => selectedTokenIds.includes(nft.tokenId));
      
      if (nfts.length === 0) {
        return NextResponse.json(
          { error: "None of the selected NFTs were found in your wallet. Ownership may have changed." },
          { status: 404 }
        );
      }
      
      // Check if user tried to select NFTs they don't own
      const missingTokenIds = selectedTokenIds.filter(id => !nfts.some(nft => nft.tokenId === id));
      if (missingTokenIds.length > 0) {
        return NextResponse.json(
          { error: `You don't own the following NFTs: ${missingTokenIds.join(', ')}` },
          { status: 403 }
        );
      }
      
      console.log(`✅ Linking ${nfts.length} selected NFT(s) out of ${allNFTs.length} total`);
    } else {
      // No selection provided - link all NFTs (backward compatibility)
      nfts = allNFTs;
      console.log(`✅ Linking all ${nfts.length} NFT(s)`);
    }

    // Extract token IDs for database storage
    const tokenIds = nfts.map(nft => nft.tokenId);
    const tokenIdsJson = JSON.stringify(tokenIds);

    // 5. Check for already linked NFTs (prevent double-linking)
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

    // 6. Save wallet link to database
    const existingWalletLink = await prisma.walletLink.findUnique({
      where: {
        solanaAddress_evmAddress: {
          solanaAddress,
          evmAddress: evmAddress.toLowerCase(),
        },
      },
    });

    // Prepare wallet link data
    // If updating existing link and skipping EVM signature, we can omit evmSignature
    // If creating new link, we need evmSignature (but can use existing one from another link if EVM already linked)
    // solanaSignature is now optional since we removed signature verification
    const updateData: {
      tokenIds: string;
      solanaSignature?: string;
      evmSignature?: string;
      updatedAt: Date;
    } = {
      tokenIds: tokenIdsJson,
      updatedAt: new Date(),
    };
    
    // Only include solanaSignature if provided
    if (solanaSignature) {
      updateData.solanaSignature = solanaSignature;
    }

    // Only include evmSignature in update if provided
    if (evmSignature) {
      updateData.evmSignature = evmSignature;
    }

    // For create, we need evmSignature - use provided one or get from existing EVM link
    let createEvmSignature = evmSignature;
    if (!createEvmSignature && existingEvmLink) {
      // EVM address already linked with a different Solana wallet - use the existing signature
      createEvmSignature = existingEvmLink.evmSignature;
      console.log('📋 Using existing EVM signature from previous link (EVM already linked)');
    } else if (!createEvmSignature && !existingWalletLink) {
      // No signature and no existing link - this shouldn't happen if logic is correct
      // But provide empty string as fallback (schema requires it)
      createEvmSignature = '';
      console.warn('⚠️ No EVM signature provided and no existing link - using empty string');
    } else if (!createEvmSignature && existingWalletLink) {
      // Updating existing link - use the existing signature
      createEvmSignature = existingWalletLink.evmSignature;
      console.log('📋 Using existing EVM signature from current link (updating)');
    }

    const walletLink = await prisma.walletLink.upsert({
      where: {
        solanaAddress_evmAddress: {
          solanaAddress,
          evmAddress: evmAddress.toLowerCase(),
        },
      },
      update: updateData,
      create: {
        solanaAddress,
        evmAddress: evmAddress.toLowerCase(),
        tokenIds: tokenIdsJson,
        solanaSignature: solanaSignature || '', // Use empty string if not provided
        evmSignature: createEvmSignature,
      },
    });

    // 7. Handle LinkedNFT entries
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

    // Get the count of linked NFTs for this EVM address
    const nftCount = await prisma.linkedNFT.count({
      where: {
        evmAddress: evmAddress.toLowerCase(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Wallets linked successfully",
      data: {
        solanaAddress: walletLink.solanaAddress,
        evmAddress: walletLink.evmAddress,
        tokenIds: tokenIds, // Return as array for frontend
        tokenCount: nftCount, // Total count of NFTs linked to this EVM address
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

