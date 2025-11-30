"use client";

import { useState } from "react";
import React from "react";
import Image from "next/image";
import { SolanaWalletConnector } from "@/components/SolanaWalletConnector";
import { EVMWalletConnector } from "@/components/EVMWalletConnector";
import { NFTSelection } from "@/components/NFTSelection";
import { useAccount, useSignMessage } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { NFTLinkStatus } from "@/components/NFTLinkStatus";

export default function Home() {
  const { address: evmAddressFromWagmi, isConnected: isEVMConnectedFromWagmi } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();

  // Lock EVM address in UI - persist even if wallet extension disconnects
  // Only clear when user explicitly clicks "Disconnect EVM Wallet"
  const [lockedEvmAddress, setLockedEvmAddress] = useState<string | null>(null);

  const [solanaData, setSolanaData] = useState<{
    solAddress: string;
    tokenIds: string[];
    signature: string;
    nfts?: { mintAddress: string; tokenId: string }[];
    verificationNonce: string;
    verificationMessage: string;
  } | null>(null);

  const [, setSelectedTokenIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  // Use locked address if available, otherwise use live address from wagmi
  const evmAddress = lockedEvmAddress || evmAddressFromWagmi || null;

  // Update locked address when wallet connects (but don't clear if it disconnects)
  // CRITICAL: Only update locked address if:
  // 1. No address is locked yet (first connection)
  // 2. The new address matches the locked address (reconnection of same wallet)
  // 3. Never change locked address to a different address unless user explicitly connects
  React.useEffect(() => {
    if (evmAddressFromWagmi && isEVMConnectedFromWagmi) {
      if (!lockedEvmAddress) {
        // No address locked yet - lock the new one
        setLockedEvmAddress(evmAddressFromWagmi);
      } else if (lockedEvmAddress.toLowerCase() !== evmAddressFromWagmi.toLowerCase()) {
        // Different address connected - don't change the locked address!
        // This prevents switching Solana wallets from changing the EVM address
      }
    }
    // Don't clear lockedEvmAddress when wallet disconnects - keep it locked until user clicks disconnect
  }, [evmAddressFromWagmi, isEVMConnectedFromWagmi, lockedEvmAddress]);

  const prevEvmAddressRef = React.useRef<string | null>(null);
  const handleEVMConnected = (_address: string) => {
    // Only reset state when EVM wallet ACTUALLY changes (not on every render)
    if (prevEvmAddressRef.current !== _address) {
      prevEvmAddressRef.current = _address;
      setSolanaData(null);
      setSelectedTokenIds([]);
      // Lock the new address
      setLockedEvmAddress(_address);
    }
  };

  const handleEVMDisconnected = () => {
    // User explicitly clicked "Disconnect EVM Wallet" - clear the lock
    setLockedEvmAddress(null);
    setSolanaData(null);
    setSelectedTokenIds([]);
  };

  const handleSolanaVerified = (data: {
    solAddress: string;
    tokenIds: string[];
    signature: string;
    nfts?: { mintAddress: string; tokenId: string }[];
    verificationNonce: string;
    verificationMessage: string;
  }) => {
    // If solAddress is empty, it means we're clearing/disconnecting
    if (!data.solAddress || data.solAddress === '') {
      setSolanaData(null);
      setSelectedTokenIds([]);
    } else {
      // Normal verification - set the data
      setSolanaData(data);
    }
  };

  const handleLinkNFTs = async (selectedTokenIds: string[]) => {
    if (!solanaData || !evmAddress || selectedTokenIds.length === 0) return;

    setIsLinking(true);
    try {
      // Use the nonce that was verified during the Solana signature step
      const nonce = solanaData.verificationNonce;
      if (!nonce) {
        throw new Error("Missing verified nonce. Please verify your Solana wallet again.");
      }

      // Step 2: Check if EVM wallet is actually connected (for signature)
      // If not connected but locked, we'll skip EVM signature
      const isEvmActuallyConnected = isEVMConnectedFromWagmi && evmAddressFromWagmi?.toLowerCase() === evmAddress.toLowerCase();
      let evmSignature: string | undefined;
      let message: string | undefined;

      if (isEvmActuallyConnected) {
        // EVM wallet is connected - get signature
        message = `I confirm linking my EVM wallet ${evmAddress} to my Solana wallet ${solanaData.solAddress} | nonce: ${nonce}`;
        try {
          evmSignature = await signMessageAsync({ message });
        } catch (err) {
          console.error("Signature error:", err);
          toast({
            title: "Signature cancelled",
            description: "You need to sign the message to link your wallets. Please make sure your EVM wallet is connected and try again.",
            variant: "destructive",
          });
          setIsLinking(false);
          return;
        }
      } else {
        // EVM wallet is locked but not connected - skip signature
      }

      // Step 3: Send to backend for verification and linking - pass selected tokenIds
      const linkResponse = await fetch("/api/link-evm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solanaAddress: solanaData.solAddress,
          evmAddress,
          evmSignature: evmSignature, // May be undefined if wallet not connected
          message: message, // May be undefined if wallet not connected
          nonce,
          solanaSignature: solanaData.signature,
          selectedTokenIds: selectedTokenIds, // Pass only selected tokenIds
          skipEvmSignature: !isEvmActuallyConnected, // Flag to skip EVM signature
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#121212] to-[#1a0a1f] dark">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="Wassieverse NFT Wallet Linker"
                width={400}
                height={100}
                className="h-auto w-auto max-w-full"
                priority
              />
            </div>
            <p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto">
              Connect your EVM wallet to create your profile, then link Wassieverse NFTs from your Solana wallets.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-6">
            {/* Step 1: EVM Wallet Connection */}
            <EVMWalletConnector 
              onConnected={handleEVMConnected}
              onDisconnected={handleEVMDisconnected}
            />

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

          {/* NFT Link Status */}
          <NFTLinkStatus />

          {/* Footer Info */}
          <div className="bg-[#202020] rounded-xl p-6 text-sm text-[#A0A0A0] space-y-2 card-depth border border-[#2a2a2a]">
            <h3 className="font-semibold text-white">How it works:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connect your EVM wallet (MetaMask, WalletConnect, etc.) - this becomes your profile</li>
              <li>Connect your Solana wallet (Phantom, etc.) and verify NFT ownership</li>
              <li>Select and link your Wassieverse NFTs to your EVM profile</li>
              <li>Add more Solana wallets to link additional NFTs to the same EVM profile</li>
              <li>All your NFTs from different Solana wallets are aggregated in one place</li>
              <li>Check if a specific Wassieverse NFT Token ID is already linked before buying on secondary</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
