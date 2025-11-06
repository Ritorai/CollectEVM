"use client";

import React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Wallet } from "lucide-react";

interface EVMWalletConnectorProps {
  onConnected: (address: string) => void;
}

export function EVMWalletConnector({ onConnected }: EVMWalletConnectorProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  // Notify parent when wallet connects
  React.useEffect(() => {
    if (isConnected && address) {
      onConnected(address);
    }
  }, [isConnected, address, onConnected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Step 1: Connect EVM Wallet
          {isConnected && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Connect your MetaMask or WalletConnect wallet. This will be your profile where all your Wassieverse NFTs from different Solana wallets will be linked.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              className="w-full"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect EVM Wallet
            </Button>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800 mb-2">
                  ✓ EVM wallet connected!
                </p>
                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">Connected Address:</p>
                  <p className="text-sm font-mono break-all">{address}</p>
                </div>
              </div>

              <Button
                onClick={() => disconnect()}
                variant="outline"
                className="w-full"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

