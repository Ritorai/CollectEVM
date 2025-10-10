"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface NFTDisplayProps {
  linkedData: {
    solanaAddress: string;
    evmAddress: string;
    tokenIds: string[];
    verifiedAt: string;
  } | null;
}

export function NFTDisplay({ linkedData }: NFTDisplayProps) {
  if (!linkedData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Wallets & NFTs</CardTitle>
        <CardDescription>
          Your verified Wassieverse NFTs and wallet information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="bg-muted rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1">Solana Wallet:</p>
            <a
              href={`https://solscan.io/account/${linkedData.solanaAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono break-all hover:text-primary flex items-center gap-1"
            >
              {linkedData.solanaAddress}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>

          <div className="bg-muted rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1">EVM Wallet:</p>
            <a
              href={`https://etherscan.io/address/${linkedData.evmAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono break-all hover:text-primary flex items-center gap-1"
            >
              {linkedData.evmAddress}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>

          <div className="bg-muted rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Verified NFTs ({linkedData.tokenIds.length}):
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {linkedData.tokenIds.map((tokenId, index) => (
                <a
                  key={tokenId}
                  href={`https://solscan.io/token/${tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono break-all hover:text-primary flex items-center gap-1 p-2 bg-background rounded border"
                >
                  <span className="text-muted-foreground">#{index + 1}</span>
                  <span className="flex-1">{tokenId}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            Verified at: {new Date(linkedData.verifiedAt).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

