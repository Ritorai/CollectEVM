"use client";

import { useState } from "react";
import React from "react";
import { SolanaWalletConnector } from "@/components/SolanaWalletConnector";
import { EVMWalletConnector } from "@/components/EVMWalletConnector";
import { NFTSelection } from "@/components/NFTSelection";
import { EVMProfile } from "@/components/EVMProfile";
import { Card, CardContent } from "@/components/ui/card";
import { useAccount, useSignMessage } from "wagmi";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { address: evmAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();

  const [solanaData, setSolanaData] = useState<{
    solAddress: string;
    tokenIds: string[];
    signature: string;
    nfts?: { mintAddress: string; tokenId: string }[];
  } | null>(null);

  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [profileKey, setProfileKey] = useState(0); // Force profile refresh

  const handleEVMConnected = (address: string) => {
    // Reset state when EVM wallet changes
    setSolanaData(null);
    setShowAddWallet(false);
    setProfileKey((prev) => prev + 1);
  };

  const handleLinkNFTs = async (tokenIds: string[]) => {
    if (!solanaData || !evmAddress) return;

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
      } catch (error) {
        toast({
          title: "Signature cancelled",
          description: "You need to sign the message to link your wallets",
          variant: "destructive",
        });
        setIsLinking(false);
        return;
      }

      // Step 3: Send to backend for verification and linking
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
        }),
      });

      const linkData = await linkResponse.json();

      if (!linkResponse.ok) {
        throw new Error(linkData.error || "Failed to link wallets");
      }

      toast({
        title: "Wallets linked successfully!",
        description: `Your ${linkData.data.tokenIds.length} Wassieverse NFT(s) are now linked to your EVM wallet`,
      });

      // Reset Solana data and refresh profile status
      setSolanaData(null);
      setSelectedTokenIds([]);
      setShowAddWallet(false);
      setProfileKey((prev) => prev + 1); // Refresh profile
      await checkProfileStatus(); // Update hasWalletLinks
    } catch (error: any) {
      console.error("Linking error:", error);
      toast({
        title: "Linking failed",
        description: error.message || "Failed to link wallets",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const [hasWalletLinks, setHasWalletLinks] = useState<boolean | null>(null);

  const handleAddAnotherWallet = () => {
    setShowAddWallet(true);
    setSolanaData(null);
    setSelectedTokenIds([]);
  };

  // Check profile status when EVM wallet connects
  React.useEffect(() => {
    const checkProfileStatus = async () => {
      if (!evmAddress) return;
      try {
        const response = await fetch(`/api/evm-profile?evmAddress=${evmAddress}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setHasWalletLinks(result.data.solanaWallets.length > 0);
          } else {
            setHasWalletLinks(false);
          }
        } else {
          setHasWalletLinks(false);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        setHasWalletLinks(false);
      }
    };

    if (isConnected && evmAddress) {
      checkProfileStatus();
    } else {
      setHasWalletLinks(null);
    }
  }, [isConnected, evmAddress]);

  // Check if profile has wallet links (for use after linking)
  const checkProfileStatus = async () => {
    if (!evmAddress) return;
    try {
      const response = await fetch(`/api/evm-profile?evmAddress=${evmAddress}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setHasWalletLinks(result.data.solanaWallets.length > 0);
        } else {
          setHasWalletLinks(false);
        }
      } else {
        setHasWalletLinks(false);
      }
    } catch (error) {
      console.error("Error checking profile:", error);
      setHasWalletLinks(false);
    }
  };

  // Show profile if EVM is connected, has wallet links, and we're not adding a wallet or verifying Solana
  // Show Solana connection if EVM is connected (always allow connecting Solana wallets)
  // Show NFTSelection when Solana is verified (regardless of existing wallet links)
  const showProfile = isConnected && evmAddress && hasWalletLinks === true && !showAddWallet && !solanaData;
  const showSolanaConnection = isConnected && evmAddress && hasWalletLinks !== null && !solanaData;

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

            {/* Loading state while checking profile */}
            {isConnected && evmAddress && hasWalletLinks === null && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Checking your profile...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Solana Wallet Connection */}
            {showSolanaConnection && (
              <SolanaWalletConnector
                evmAddress={evmAddress}
                onVerified={setSolanaData}
              />
            )}

            {/* NFT Selection - Always show when EVM is connected */}
            {isConnected && evmAddress && hasWalletLinks !== null && (
              <NFTSelection
                solanaAddress={solanaData?.solAddress || null}
                evmAddress={evmAddress}
                verifiedNFTs={solanaData?.nfts || []}
                onSelectionChange={setSelectedTokenIds}
                onLinkNFTs={handleLinkNFTs}
                isLinking={isLinking}
              />
            )}
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
