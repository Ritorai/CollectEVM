"use client";

import { useState } from "react";
import { SolanaWalletConnector } from "@/components/SolanaWalletConnector";
import { EVMWalletConnector } from "@/components/EVMWalletConnector";
import { NFTDisplay } from "@/components/NFTDisplay";
import { NFTSelection } from "@/components/NFTSelection";

export default function Home() {
  const [solanaData, setSolanaData] = useState<{
    solAddress: string;
    tokenIds: string[];
    signature: string;
  } | null>(null);

  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);

  const [linkedData, setLinkedData] = useState<{
    solanaAddress: string;
    evmAddress: string;
    tokenIds: string[];
    verifiedAt: string;
  } | null>(null);

  const handleLinkNFTs = async (_tokenIds: string[]) => {
    if (!solanaData || !evmAddress) return;

    setIsLinking(true);
    try {
      // Generate nonce
      const nonceResponse = await fetch('/api/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: solanaData.solAddress }),
      });

      if (!nonceResponse.ok) throw new Error('Failed to get nonce');
      const { nonce } = await nonceResponse.json();

      // Request Solana signature (you'll need to implement this)
      // For now, we'll use the existing signature
      const solanaSignature = solanaData.signature;

      // Create message for EVM signature
      const evmMessage = `Link Solana wallet ${solanaData.solAddress} to EVM wallet ${evmAddress}. Nonce: ${nonce}`;
      
      // Request EVM signature (you'll need to implement this)
      // For now, we'll use a placeholder
      const evmSignature = "placeholder_signature";

      // Link the wallets
      const linkResponse = await fetch('/api/link-evm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solanaAddress: solanaData.solAddress,
          evmAddress,
          evmSignature,
          message: evmMessage,
          nonce,
          solanaSignature,
        }),
      });

      if (!linkResponse.ok) {
        const errorData = await linkResponse.json();
        throw new Error(errorData.error || 'Failed to link wallets');
      }

      const linkData = await linkResponse.json();
      setLinkedData({
        solanaAddress: solanaData.solAddress,
        evmAddress,
        tokenIds: linkData.data.tokenIds,
        verifiedAt: new Date().toISOString(),
      });

      // Clear selection
      setSelectedTokenIds([]);
      
    } catch (error) {
      console.error('Linking failed:', error);
      alert(`Linking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLinking(false);
    }
  };

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
            
            {solanaData && (
              <NFTSelection
                solanaAddress={solanaData.solAddress}
                evmAddress={evmAddress}
                onSelectionChange={setSelectedTokenIds}
                onLinkNFTs={handleLinkNFTs}
                isLinking={isLinking}
              />
            )}
            
            <EVMWalletConnector
              solanaData={solanaData}
              onLinked={(data) => {
                setLinkedData(data);
                setEvmAddress(data.evmAddress);
              }}
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

