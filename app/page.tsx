"use client";

import { useState } from "react";
import { SolanaWalletConnector } from "@/components/SolanaWalletConnector";
import { EVMWalletConnector } from "@/components/EVMWalletConnector";
import { NFTDisplay } from "@/components/NFTDisplay";

export default function Home() {
  const [solanaData, setSolanaData] = useState<{
    solAddress: string;
    tokenIds: string[];
    signature: string;
  } | null>(null);

  const [linkedData, setLinkedData] = useState<{
    solanaAddress: string;
    evmAddress: string;
    tokenIds: string[];
    verifiedAt: string;
  } | null>(null);

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
              Verify your Wassieverse NFT ownership on Solana and securely link
              your EVM wallet for cross-chain benefits.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-6">
            <SolanaWalletConnector onVerified={setSolanaData} />
            <EVMWalletConnector
              solanaData={solanaData}
              onLinked={setLinkedData}
            />
            {linkedData && <NFTDisplay linkedData={linkedData} />}
          </div>

          {/* Footer Info */}
          <div className="bg-muted/50 rounded-lg p-6 text-sm text-muted-foreground space-y-2">
            <h3 className="font-semibold text-foreground">How it works:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connect your Phantom wallet and sign a message to verify ownership</li>
              <li>Our server checks the Solana blockchain for Wassieverse NFTs</li>
              <li>Connect your MetaMask or EVM wallet and sign to create the link</li>
              <li>Both signatures are verified server-side before storing the mapping</li>
              <li>Your wallet addresses and NFT IDs are securely saved in our database</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

