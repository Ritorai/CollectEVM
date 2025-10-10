"use client";

import { useState } from "react";
import { useAccount, useSignMessage, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";

interface EVMWalletConnectorProps {
  solanaData: {
    solAddress: string;
    tokenIds: string[];
    signature: string;
  } | null;
  onLinked: (data: any) => void;
}

export function EVMWalletConnector({ solanaData, onLinked }: EVMWalletConnectorProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const handleLink = async () => {
    if (!address || !solanaData) {
      toast({
        title: "Error",
        description: "Please verify your Solana wallet first",
        variant: "destructive",
      });
      return;
    }

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
      const message = `I confirm linking my EVM wallet ${address} to my Solana wallet ${solanaData.solAddress} | nonce: ${nonce}`;

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
          evmAddress: address,
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

      setIsLinked(true);
      toast({
        title: "Wallets linked successfully!",
        description: `Your ${linkData.data.tokenIds.length} Wassieverse NFT(s) are now linked to your EVM wallet`,
      });

      onLinked(linkData.data);
    } catch (error: any) {
      console.error("Linking error:", error);
      toast({
        title: "Linking failed",
        description: error.message || "Failed to link EVM wallet",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const disabled = !solanaData;

  return (
    <Card className={disabled ? "opacity-50" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Step 2: Link EVM Wallet
          {isLinked && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          {disabled
            ? "Complete Step 1 first to link your EVM wallet"
            : "Connect your MetaMask or WalletConnect to link wallets"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={disabled}
              className="w-full"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect EVM Wallet
            </Button>
          ) : (
            <>
              <div className="bg-muted rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Connected Address:</p>
                <p className="text-sm font-mono break-all">{address}</p>
              </div>

              {!isLinked && (
                <Button
                  onClick={handleLink}
                  disabled={isLinking}
                  className="w-full"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    "Link Wallets"
                  )}
                </Button>
              )}

              <Button
                onClick={() => disconnect()}
                variant="outline"
                className="w-full"
              >
                Disconnect
              </Button>
            </>
          )}

          {isLinked && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800">
                ✓ Wallets linked successfully! Your NFTs are now associated with your EVM wallet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

