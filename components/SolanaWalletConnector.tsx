"use client";

import { useState } from "react";
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
  onVerified: (data: { solAddress: string; tokenIds: string[]; signature: string }) => void;
}

export function SolanaWalletConnector({ onVerified }: SolanaWalletConnectorProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [nftCount, setNftCount] = useState<number | null>(null);

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
      } catch (error) {
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
        
        toast({
          title: "Solana wallet verified!",
          description: `Found ${verifyData.tokenIds.length} Wassieverse NFT(s)`,
        });

        onVerified({
          solAddress,
          tokenIds: verifyData.tokenIds,
          signature: signatureBase58,
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify Solana wallet",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Step 1: Connect Solana Wallet
          {isVerified && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Connect your Phantom wallet to verify Wassieverse NFT ownership
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !h-10 !px-4 !rounded-md !text-sm !font-medium" />
          
          {connected && !isVerified && (
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
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

          {isVerified && nftCount !== null && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                ✓ Verified! Found {nftCount} Wassieverse NFT{nftCount !== 1 ? "s" : ""} in your wallet
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

