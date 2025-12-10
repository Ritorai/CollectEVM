"use client";

import { useState } from "react";
import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

interface SolanaWalletConnectorProps {
  evmAddress: string | null;
  onVerified: (data: {
    solAddress: string;
    tokenIds: string[];
    signature: string;
    nfts: { mintAddress: string; tokenId: string }[];
    verificationNonce: string;
    verificationMessage: string;
  }) => void;
}

export function SolanaWalletConnector({ evmAddress, onVerified }: SolanaWalletConnectorProps) {
  const { publicKey, connected, disconnect } = useWallet();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [nftCount, setNftCount] = useState<number | null>(null);

  // Track previous publicKey to detect wallet changes
  const prevPublicKeyRef = React.useRef<string | null>(null);
  const prevConnectedRef = React.useRef<boolean>(false);

  // Automatically check NFTs when wallet connects
  React.useEffect(() => {
    const currentPublicKey = publicKey?.toString() || null;
    const wasConnected = prevConnectedRef.current;
    const wasPublicKey = prevPublicKeyRef.current;
    
    // If wallet disconnected (was connected, now not)
    if (wasConnected && (!connected || !publicKey)) {
      console.log('🔄 Solana wallet disconnected, resetting verification state');
      setIsVerified(false);
      setNftCount(null);
      prevPublicKeyRef.current = null;
      prevConnectedRef.current = false;
      // Clear parent state when wallet disconnects
      onVerified({
        solAddress: '',
        tokenIds: [],
        signature: '',
        nfts: [],
        verificationNonce: '',
        verificationMessage: ''
      });
    } 
    // If wallet changed (different publicKey while still connected)
    else if (connected && publicKey && wasPublicKey && wasPublicKey !== currentPublicKey && currentPublicKey) {
      console.log('🔄 Solana wallet changed, checking NFTs for new wallet');
      setIsVerified(false);
      setNftCount(null);
      prevPublicKeyRef.current = currentPublicKey;
      prevConnectedRef.current = true;
      // Automatically check NFTs for the new wallet
      checkNFTs(currentPublicKey);
    }
    // If wallet connected for the first time
    else if (connected && publicKey && !wasPublicKey && currentPublicKey) {
      console.log('🔄 Solana wallet connected, automatically checking NFTs');
      prevPublicKeyRef.current = currentPublicKey;
      prevConnectedRef.current = true;
      // Automatically check NFTs when wallet connects
      checkNFTs(currentPublicKey);
    }
    // Update connected state
    else if (connected && publicKey) {
      prevConnectedRef.current = true;
    } else {
      prevConnectedRef.current = false;
    }
  }, [connected, publicKey, onVerified]);

  // Function to check NFTs automatically (no signature required)
  const checkNFTs = async (solAddress: string) => {
    setIsVerifying(true);
    
    try {
      const checkResponse = await fetch("/api/check-nfts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solAddress,
        }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        const errorMsg = checkData.error || "Failed to check NFTs";
        // Don't show error toast if no NFTs found - that's normal
        if (errorMsg.includes("No Wassieverse NFTs")) {
          setIsVerified(false);
          setNftCount(0);
          onVerified({
            solAddress,
            tokenIds: [],
            signature: '',
            nfts: [],
            verificationNonce: '',
            verificationMessage: ''
          });
          return;
        }
        throw new Error(errorMsg);
      }

      if (checkData.success) {
        setIsVerified(true);
        setNftCount(checkData.tokenIds.length);
        
        const nftsArray = checkData.nfts || [];
        
        const dataToPass = {
          solAddress,
          tokenIds: checkData.tokenIds,
          signature: '', // No signature needed for display
          nfts: nftsArray,
          verificationNonce: '', // No nonce needed for display
          verificationMessage: '', // No message needed for display
        };
        
        if (checkData.tokenIds.length > 0) {
          toast({
            title: "NFTs found!",
            description: `Found ${checkData.tokenIds.length} Wassieverse NFT(s) in this wallet`,
          });
        }

        onVerified(dataToPass);
      }
    } catch (err: unknown) {
      console.error("NFT check error:", err);
      // Don't show error toast for automatic checks - just log it
      setIsVerified(false);
      setNftCount(null);
    } finally {
      setIsVerifying(false);
    }
  };


  const disabled = !evmAddress;

  return (
    <Card className={disabled ? "opacity-50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Step 2: Connect Solana Wallet
          {isVerified && <CheckCircle2 className="h-5 w-5 text-[#34C759]" />}
        </CardTitle>
            <CardDescription className="text-[#A0A0A0]">
              {disabled
                ? "Complete Step 1 first - connect your EVM wallet"
                : "Connect your Solana wallet (Phantom, Ledger, etc.) to view your Wassieverse NFTs"}
            </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <WalletMultiButton 
            className="!bg-[#8A2BE2] !text-white hover:!bg-[#9B3DF3] hover:!glow-purple !h-10 !px-4 !rounded-xl !text-sm !font-medium !transition-all !duration-200"
            disabled={disabled}
          />
          
          {connected && isVerifying && (
            <div className="flex items-center justify-center gap-2 text-sm text-[#A0A0A0]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for NFTs...
            </div>
          )}

          {connected && (
            <Button
              onClick={async () => {
                // Clear verification state first
                setIsVerified(false);
                setNftCount(null);
                // Then disconnect the wallet
                // The useEffect will handle clearing parent state
                await disconnect();
              }}
              variant="outline"
              className="w-full"
            >
              Disconnect Solana Wallet
            </Button>
          )}

          {isVerified && nftCount !== null && nftCount > 0 && (
            <div className="bg-[#1a3a1a] border border-[#34C759]/30 rounded-xl p-4 inner-glow">
              <p className="text-sm text-[#34C759] font-semibold">
                ✓ Found {nftCount} Wassieverse NFT{nftCount !== 1 ? "s" : ""} in this wallet
              </p>
            </div>
          )}
          
          {isVerified && nftCount === 0 && (
            <div className="bg-[#2a1a3a] border border-[#B066FF]/30 rounded-xl p-4">
              <p className="text-sm text-[#A0A0A0]">
                No Wassieverse NFTs found in this wallet
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

