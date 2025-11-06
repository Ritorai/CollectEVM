"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EVMProfileProps {
  evmAddress: string;
  onAddAnotherWallet: () => void;
}

interface ProfileData {
  evmAddress: string;
  totalNFTs: number;
  solanaWallets: {
    solanaAddress: string;
    nftCount: number;
    verifiedAt: string;
    updatedAt: string;
  }[];
  nftsByWallet: {
    solanaAddress: string;
    nfts: {
      id: string;
      tokenId: string;
      mintAddress: string;
      linkedAt: string;
    }[];
    verifiedAt: string;
  }[];
}

export function EVMProfile({ evmAddress, onAddAnotherWallet }: EVMProfileProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/evm-profile?evmAddress=${evmAddress}`);
      const result = await response.json();
      
      if (!response.ok) {
        const errorMsg = result.details || result.error || "Failed to fetch profile";
        throw new Error(errorMsg);
      }
      
      if (result.success) {
        setProfileData(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch profile");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
      console.error("Profile fetch error:", err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (evmAddress) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmAddress]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading your profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-red-600 font-semibold">Failed to load your profile:</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchProfile} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your EVM Profile</CardTitle>
              <CardDescription>
                All your Wassieverse NFTs from {profileData.solanaWallets.length} Solana wallet
                {profileData.solanaWallets.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <Button onClick={fetchProfile} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-md p-4">
            <p className="text-xs text-muted-foreground mb-1">EVM Wallet:</p>
            <a
              href={`https://etherscan.io/address/${profileData.evmAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono break-all hover:text-primary flex items-center gap-1"
            >
              {profileData.evmAddress}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-xs text-blue-600 mb-1">Total NFTs</p>
              <p className="text-2xl font-bold text-blue-900">
                {profileData.totalNFTs}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
              <p className="text-xs text-purple-600 mb-1">Solana Wallets</p>
              <p className="text-2xl font-bold text-purple-900">
                {profileData.solanaWallets.length}
              </p>
            </div>
          </div>

          <Button onClick={onAddAnotherWallet} className="w-full" variant="outline">
            + Add Another Solana Wallet
          </Button>
        </CardContent>
      </Card>

      {/* NFTs by Wallet */}
      {profileData.nftsByWallet.map((wallet) => (
        <Card key={wallet.solanaAddress}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Solana Wallet
                  <Badge variant="outline" className="ml-2">
                    {wallet.nfts.length} NFT{wallet.nfts.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  <a
                    href={`https://solscan.io/account/${wallet.solanaAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs hover:text-primary flex items-center gap-1"
                  >
                    {wallet.solanaAddress}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {wallet.nfts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {wallet.nfts.map((nft) => (
                  <div
                    key={nft.id}
                    className="border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          Wassieverse #{nft.tokenId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Linked {new Date(nft.linkedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`https://solscan.io/token/${nft.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No NFTs linked from this wallet yet
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {profileData.nftsByWallet.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">
                No NFTs linked yet
              </p>
              <p className="text-muted-foreground">
                Connect your first Solana wallet and verify your Wassieverse NFTs to get started!
              </p>
            </div>
            <Button onClick={onAddAnotherWallet} className="mt-4">
              Connect Solana Wallet
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

