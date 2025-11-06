"use client";

import { useState } from "react";
import React from "react";
import { SolanaWalletConnector } from "@/components/SolanaWalletConnector";
import { EVMWalletConnector } from "@/components/EVMWalletConnector";
import { NFTSelection } from "@/components/NFTSelection";
import { useAccount, useSignMessage } from "wagmi";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { address: evmAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();

  const [solanaData, setSolanaData] = useState<{
    solAddress: string;
    tokenIds: string[];
    signature: string;
    nfts?: { mintAddress: string; tokenId: string }[];
  } | null>(null);

  const [, setSelectedTokenIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  const prevEvmAddressRef = React.useRef<string | null>(null);
  const handleEVMConnected = (_address: string) => {
    // Only reset state when EVM wallet ACTUALLY changes (not on every render)
    if (prevEvmAddressRef.current !== _address) {
      prevEvmAddressRef.current = _address;
      console.log('🔄 EVM wallet changed, resetting solanaData');
      setSolanaData(null);
      setSelectedTokenIds([]);
    }
  };

  const handleSolanaVerified = (data: { solAddress: string; tokenIds: string[]; signature: string; nfts?: { mintAddress: string; tokenId: string }[] }) => {
    // If solAddress is empty, it means we're clearing/disconnecting
    if (!data.solAddress || data.solAddress === '') {
      console.log('🔄 Clearing solanaData due to disconnect');
      setSolanaData(null);
      setSelectedTokenIds([]);
    } else {
      // Normal verification - set the data
      setSolanaData(data);
    }
  };

  // Debug: Log when solanaData changes
  React.useEffect(() => {
    console.log('🏠 Home: solanaData changed:', { 
      hasSolanaData: !!solanaData, 
      solAddress: solanaData?.solAddress,
      nftCount: solanaData?.nfts?.length,
      nfts: solanaData?.nfts,
      nftsString: JSON.stringify(solanaData?.nfts),
      fullSolanaData: JSON.stringify(solanaData),
      willPassToNFTSelection: solanaData?.nfts ?? []
    });
  }, [solanaData]);

  // Don't clear selection when verifying - only clear when wallet actually changes
  // Selection should persist through verification

  const handleLinkNFTs = async (selectedTokenIds: string[]) => {
    if (!solanaData || !evmAddress || selectedTokenIds.length === 0) return;

    setIsLinking(true);
    try {
      // Step 1: Get a new nonce for EVM linking
      const nonceResponse = await fetch("/api/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: solanaData.solAddress }),
      });

      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }

      const { nonce } = await nonceResponse.json();

      // Step 2: Create message and sign with EVM wallet
      const message = `I confirm linking my EVM wallet ${evmAddress} to my Solana wallet ${solanaData.solAddress} | nonce: ${nonce}`;

      let evmSignature: string;
      try {
        evmSignature = await signMessageAsync({ message });
      } catch {
        toast({
          title: "Signature cancelled",
          description: "You need to sign the message to link your wallets",
          variant: "destructive",
        });
        setIsLinking(false);
        return;
      }

      // Step 3: Send to backend for verification and linking - pass selected tokenIds
      const linkResponse = await fetch("/api/link-evm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solanaAddress: solanaData.solAddress,
          evmAddress,
          evmSignature,
          message,
          nonce,
          solanaSignature: solanaData.signature,
          selectedTokenIds: selectedTokenIds, // Pass only selected tokenIds
        }),
      });

      const linkData = await linkResponse.json();

      if (!linkResponse.ok) {
        throw new Error(linkData.error || "Failed to link wallets");
      }

      toast({
        title: "Wallets linked successfully!",
        description: `Your ${selectedTokenIds.length} selected Wassieverse NFT(s) are now linked to your EVM wallet`,
      });

      // Reset Solana data
      setSolanaData(null);
      setSelectedTokenIds([]);
      } catch (err: unknown) {
        console.error("Linking error:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to link wallets";
        toast({
          title: "Linking failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
      setIsLinking(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Wassieverse NFT Wallet Linker
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect your EVM wallet to create your profile, then link Wassieverse NFTs from your Solana wallets.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-6">
            {/* Step 1: EVM Wallet Connection */}
            <EVMWalletConnector onConnected={handleEVMConnected} />

            {/* Step 2: Solana Wallet Connection - Always show, grayed out until EVM connected */}
            <SolanaWalletConnector
              evmAddress={evmAddress || null}
              onVerified={handleSolanaVerified}
            />

            {/* NFT Selection - Always show, grayed out until EVM connected */}
            <NFTSelection
              key={`nft-selection-${solanaData?.solAddress || 'no-solana'}-${evmAddress || 'no-evm'}`}
              solanaAddress={solanaData?.solAddress ?? null}
              evmAddress={evmAddress ?? null}
              verifiedNFTs={solanaData?.nfts ?? []}
              onSelectionChange={setSelectedTokenIds}
              onLinkNFTs={handleLinkNFTs}
              isLinking={isLinking}
            />
          </div>

          {/* Footer Info */}
          <div className="bg-muted/50 rounded-lg p-6 text-sm text-muted-foreground space-y-2">
            <h3 className="font-semibold text-foreground">How it works:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connect your EVM wallet (MetaMask, WalletConnect, etc.) - this becomes your profile</li>
              <li>Connect your Solana wallet (Phantom, etc.) and verify NFT ownership</li>
              <li>Select and link your Wassieverse NFTs to your EVM profile</li>
              <li>Add more Solana wallets to link additional NFTs to the same EVM profile</li>
              <li>All your NFTs from different Solana wallets are aggregated in one place</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
