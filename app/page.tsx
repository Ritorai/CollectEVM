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
      // Step 1: Check if EVM wallet is actually connected (for signature)
      // If not connected but locked, we'll skip EVM signature
      const isEvmActuallyConnected = isEVMConnectedFromWagmi && evmAddressFromWagmi?.toLowerCase() === evmAddress.toLowerCase();
      let evmSignature: string | undefined;
      let message: string | undefined;

      if (isEvmActuallyConnected) {
        // EVM wallet is connected - get signature
        // Format message for Ledger compatibility (shorter, clearer format)
        // Nonce is optional now - use it if available, otherwise omit it
        const nonce = solanaData.verificationNonce;
        message = nonce 
          ? `I confirm linking my EVM wallet ${evmAddress} to my Solana wallet ${solanaData.solAddress} | nonce: ${nonce}`
          : `I confirm linking my EVM wallet ${evmAddress} to my Solana wallet ${solanaData.solAddress}`;
        try {
          // Use signMessageAsync with proper encoding for Ledger compatibility
          evmSignature = await signMessageAsync({ 
            message,
            // Ensure proper encoding for Ledger devices
          });
        } catch (err: unknown) {
          console.error("Signature error:", err);
          
          // Check for Ledger-specific errors
          const errorMessage = err instanceof Error ? err.message : String(err);
          const isLedgerError = errorMessage.includes('Ledger') || 
                                errorMessage.includes('0x6a80') ||
                                errorMessage.includes('Invalid data');
          
          if (isLedgerError) {
            toast({
              title: "Ledger Signing Error",
              description: "Please ensure your Ledger device is unlocked, the Ethereum app is open, and 'Contract Data' is enabled in the app settings. Then try again.",
              variant: "destructive",
            });
          } else if (errorMessage.includes('User rejected') || errorMessage.includes('denied')) {
            toast({
              title: "Signature cancelled",
              description: "You cancelled the signature request. Please try again when ready.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Signature error",
              description: "Failed to sign message. Please make sure your wallet is connected and try again. If using Ledger, ensure 'Contract Data' is enabled.",
              variant: "destructive",
            });
          }
          setIsLinking(false);
          return;
        }
      } else {
        // EVM wallet is locked but not connected - skip signature
      }

      // Step 2: Send to backend for verification and linking - pass selected tokenIds
      // Nonce and solanaSignature are now optional since we removed signature verification
      const linkResponse = await fetch("/api/link-evm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solanaAddress: solanaData.solAddress,
          evmAddress,
          evmSignature: evmSignature, // May be undefined if wallet not connected
          message: message, // May be undefined if wallet not connected
          nonce: solanaData.verificationNonce || undefined, // Optional - only send if available
          solanaSignature: solanaData.signature || undefined, // Optional - only send if available
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
          {/* Header - Logo */}
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
          </div>

          {/* Information Message */}
          <div className="text-center">
            <p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto font-semibold">
              NFT TO EVM WALLET LINKER IS CLOSED, YOU CAN STILL CHECK IF YOUR LINKED YOUR NFTS BELOW
            </p>
          </div>

          {/* NFT Link Status */}
          <NFTLinkStatus />
        </div>
      </div>
    </div>
  );
}
