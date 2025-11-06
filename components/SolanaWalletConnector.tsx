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
import bs58 from "bs58";
import { CheckCircle2, Loader2 } from "lucide-react";

interface SolanaWalletConnectorProps {
  evmAddress: string | null;
  onVerified: (data: { solAddress: string; tokenIds: string[]; signature: string; nfts: { mintAddress: string; tokenId: string }[] }) => void;
}

export function SolanaWalletConnector({ evmAddress, onVerified }: SolanaWalletConnectorProps) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [nftCount, setNftCount] = useState<number | null>(null);

  // Track previous publicKey to detect wallet changes
  const prevPublicKeyRef = React.useRef<string | null>(null);
  const prevConnectedRef = React.useRef<boolean>(false);

  // Reset verification state when wallet disconnects or changes
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
        nfts: []
      });
    } 
    // If wallet changed (different publicKey while still connected)
    else if (connected && publicKey && wasPublicKey && wasPublicKey !== currentPublicKey) {
      console.log('🔄 Solana wallet changed, resetting verification state');
      setIsVerified(false);
      setNftCount(null);
      prevPublicKeyRef.current = currentPublicKey;
      prevConnectedRef.current = true;
      // Clear parent state when wallet changes
      onVerified({
        solAddress: '',
        tokenIds: [],
        signature: '',
        nfts: []
      });
    }
    // If wallet connected for the first time or reconnected with same key
    else if (connected && publicKey) {
      if (!wasPublicKey) {
        prevPublicKeyRef.current = currentPublicKey;
      }
      prevConnectedRef.current = true;
    }
    // Update connected state
    else {
      prevConnectedRef.current = false;
    }
  }, [connected, publicKey, onVerified]);

  const handleVerify = async () => {
    if (!publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your Phantom wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const solAddress = publicKey.toString();

      // Step 1: Get nonce
      const nonceResponse = await fetch("/api/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: solAddress }),
      });

      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }

      const { nonce } = await nonceResponse.json();

      // Step 2: Create message and sign it
      const timestamp = Date.now();
      const message = `Link EVM address | nonce: ${nonce} | timestamp: ${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      let signature: Uint8Array;
      try {
        signature = await signMessage(messageBytes);
      } catch {
        toast({
          title: "Signature cancelled",
          description: "You need to sign the message to verify ownership",
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      const signatureBase58 = bs58.encode(signature);

      // Step 3: Verify Solana signature and check NFTs
      const verifyResponse = await fetch("/api/verify-solana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solAddress,
          signature: signatureBase58,
          message,
          nonce,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || "Verification failed");
      }

      if (verifyData.verified) {
        setIsVerified(true);
        setNftCount(verifyData.tokenIds.length);
        
        // Ensure nfts array is present
        const nftsArray = verifyData.nfts || [];
        
        console.log('✅ SolanaWalletConnector: Verification response from API:', {
          verified: verifyData.verified,
          tokenIds: verifyData.tokenIds,
          tokenIdsLength: verifyData.tokenIds?.length,
          nfts: verifyData.nfts,
          nftsLength: verifyData.nfts?.length,
          nftsArray: nftsArray,
          nftsArrayLength: nftsArray.length,
          fullResponse: JSON.stringify(verifyData)
        });
        
        const dataToPass = {
          solAddress,
          tokenIds: verifyData.tokenIds,
          signature: signatureBase58,
          nfts: nftsArray,
        };
        
        console.log('📤 SolanaWalletConnector: Calling onVerified with:', dataToPass);
        console.log('📦 Final NFT data being passed:', {
          nfts: dataToPass.nfts,
          nftsLength: dataToPass.nfts.length,
          nftsString: JSON.stringify(dataToPass.nfts)
        });
        
        toast({
          title: "Solana wallet verified!",
          description: `Found ${verifyData.tokenIds.length} Wassieverse NFT(s)`,
        });

        onVerified(dataToPass);
      }
    } catch (err: unknown) {
      console.error("Verification error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to verify Solana wallet";
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
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
                : "Connect your Phantom wallet to verify Wassieverse NFT ownership"}
            </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <WalletMultiButton 
            className="!bg-[#8A2BE2] !text-white hover:!bg-[#9B3DF3] hover:!glow-purple !h-10 !px-4 !rounded-xl !text-sm !font-medium !transition-all !duration-200"
            disabled={disabled}
          />
          
          {connected && !isVerified && (
            <Button
              onClick={handleVerify}
              disabled={isVerifying || disabled}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify NFT Ownership"
              )}
            </Button>
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

          {isVerified && nftCount !== null && (
            <div className="bg-[#1a3a1a] border border-[#34C759]/30 rounded-xl p-4 inner-glow">
              <p className="text-sm text-[#34C759] font-semibold">
                ✓ Verified! Found {nftCount} Wassieverse NFT{nftCount !== 1 ? "s" : ""} in this wallet
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

