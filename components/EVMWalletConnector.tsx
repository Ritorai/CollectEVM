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
  onDisconnected?: () => void;
}

export function EVMWalletConnector({ onConnected, onDisconnected }: EVMWalletConnectorProps) {
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Lock address in component - persist even if wagmi disconnects
  const [lockedAddress, setLockedAddress] = React.useState<string | undefined>(undefined);
  
  // Use locked address for display, wagmi address for actual connection state
  const address = lockedAddress || wagmiAddress;
  const isConnected = lockedAddress ? true : wagmiIsConnected; // Show as connected if we have locked address

  React.useEffect(() => {
    if (wagmiAddress && wagmiIsConnected) {
      if (!lockedAddress) {
        // No address locked yet - lock the new one
        setLockedAddress(wagmiAddress);
      } else if (lockedAddress.toLowerCase() === wagmiAddress.toLowerCase()) {
        // Same address reconnected - that's fine, keep it locked
        // (no need to update, already locked)
      } else {
        // Different address connected - don't change the locked address!
        // This prevents switching Solana wallets from changing the EVM address
        console.log('⚠️ Different EVM address detected in component, but keeping locked address:', {
          locked: lockedAddress,
          new: wagmiAddress
        });
      }
    }
    // Don't clear lockedAddress when wagmi disconnects - keep it locked until user clicks disconnect
  }, [wagmiAddress, wagmiIsConnected, lockedAddress]);

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === "injected");
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  // Track if wallet was manually disconnected (to prevent auto-reconnect issues)
  const wasManuallyDisconnectedRef = React.useRef<boolean>(false);
  const prevIsConnectedRef = React.useRef<boolean>(false);

  // Notify parent when wallet connects - only when it actually changes
  const prevAddressRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    // Track connection state changes
    if (prevIsConnectedRef.current && !wagmiIsConnected) {
      // Wallet was disconnected in wagmi - but we keep it locked
      if (lockedAddress) {
        console.log('🔒 EVM wallet disconnected in extension, but address is locked - keeping profile active');
      } else {
        console.log('🔄 EVM wallet disconnected');
      }
    }
    prevIsConnectedRef.current = wagmiIsConnected;

    // Only notify parent if:
    // 1. Address actually changed (not just reconnected)
    // 2. The new address matches the locked address (or no address is locked)
    if (wagmiAddress && wagmiIsConnected && wagmiAddress !== prevAddressRef.current) {
      // Check if this is the same as locked address (or no address locked)
      if (!lockedAddress || lockedAddress.toLowerCase() === wagmiAddress.toLowerCase()) {
        prevAddressRef.current = wagmiAddress;
        wasManuallyDisconnectedRef.current = false;
        onConnected(wagmiAddress);
      } else {
        // Different address - don't notify parent, keep using locked address
        console.log('⚠️ Different EVM address connected, but keeping locked address - not notifying parent');
      }
    } else if (!wagmiIsConnected && prevAddressRef.current && !lockedAddress) {
      // Wallet disconnected and not locked - only reset if it wasn't manual
      if (!wasManuallyDisconnectedRef.current) {
        console.log('⚠️ EVM wallet disconnected unexpectedly - this should not happen when switching Solana wallets');
      }
      prevAddressRef.current = undefined;
    }
  }, [wagmiIsConnected, wagmiAddress, onConnected, lockedAddress]);

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
                onClick={() => {
                  wasManuallyDisconnectedRef.current = true;
                  setLockedAddress(undefined); // Clear locked address
                  if (wagmiIsConnected) {
                    disconnect(); // Only disconnect if actually connected
                  }
                  // Notify parent that user explicitly disconnected
                  if (onDisconnected) {
                    onDisconnected();
                  }
                }}
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

