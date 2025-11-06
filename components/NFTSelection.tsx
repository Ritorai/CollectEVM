'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link, Unlink } from 'lucide-react';

interface NFT {
  mintAddress: string;
  tokenId: string;
  name: string;
  image?: string;
  isLinked: boolean;
  linkedTo?: string; // EVM address it's linked to
  linkedFromSolana?: string; // Solana address it was linked from
}

interface NFTSelectionProps {
  solanaAddress?: string | null;
  evmAddress?: string | null;
  verifiedNFTs?: { mintAddress: string; tokenId: string }[];
  onSelectionChange: (selectedTokenIds: string[]) => void;
  onLinkNFTs: (selectedTokenIds: string[]) => Promise<void>;
  isLinking: boolean;
}

export function NFTSelection({ 
  solanaAddress, 
  evmAddress, 
  verifiedNFTs = [],
  onSelectionChange, 
  onLinkNFTs, 
  isLinking 
}: NFTSelectionProps) {
  const isDisabled = !evmAddress;
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [allLinkedNFTs, setAllLinkedNFTs] = useState<NFT[]>([]); // All NFTs linked to EVM from any Solana wallet
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkingStatus = useCallback(async () => {
    if (!evmAddress) {
      setAllLinkedNFTs([]);
      setNfts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // First, fetch all NFTs linked to this EVM address from any Solana wallet
      try {
        const profileResponse = await fetch(`/api/evm-profile?evmAddress=${evmAddress}`);
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success) {
            // Convert all linked NFTs to NFT format (handle empty array gracefully)
            const linkedNFTsList: NFT[] = (profileData.data.nfts || []).map((nft: any) => ({
              mintAddress: nft.mintAddress,
              tokenId: nft.tokenId,
              name: `Wassieverse #${nft.tokenId}`,
              isLinked: true,
              linkedTo: evmAddress,
              linkedFromSolana: nft.solanaAddress
            }));
            setAllLinkedNFTs(linkedNFTsList);
          } else {
            // API returned success: false, but that's okay - just means no NFTs
            setAllLinkedNFTs([]);
          }
        } else {
          // Non-OK response - try to get error message
          try {
            const errorData = await profileResponse.json();
            console.error('Profile API error:', errorData);
            // Don't set error here - just show empty state
            setAllLinkedNFTs([]);
          } catch {
            // If we can't parse the error, just show empty state
            setAllLinkedNFTs([]);
          }
        }
      } catch (profileErr) {
        // Network error or other fetch error
        console.error('Error fetching profile:', profileErr);
        // Don't show error for empty profiles - just set empty array
        setAllLinkedNFTs([]);
      }

      // Then, get the linking status for NFTs in the currently connected Solana wallet (if any)
      if (verifiedNFTs && verifiedNFTs.length > 0) {
        try {
          const linkingStatusResponse = await fetch('/api/nft-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tokenIds: verifiedNFTs.map(nft => nft.tokenId),
              evmAddress: evmAddress // Check if linked to this specific EVM address
            }),
          });

          let linkingStatuses: Record<string, { isLinked: boolean; linkedTo?: string; solanaAddress?: string }> = {};
          
          if (linkingStatusResponse.ok) {
            const statusData = await linkingStatusResponse.json();
            linkingStatuses = statusData.statuses || {};
          }

          // Combine verified NFT data with linking status
          const nftsWithStatus = verifiedNFTs.map((nft) => ({
            mintAddress: nft.mintAddress,
            tokenId: nft.tokenId,
            name: `Wassieverse #${nft.tokenId}`,
            isLinked: linkingStatuses[nft.tokenId]?.isLinked || false,
            linkedTo: linkingStatuses[nft.tokenId]?.linkedTo,
            linkedFromSolana: linkingStatuses[nft.tokenId]?.solanaAddress
          }));

          setNfts(nftsWithStatus);
        } catch (statusErr) {
          console.error('Error fetching NFT status:', statusErr);
          // If status check fails, just mark all as unlinked
          const nftsWithStatus = verifiedNFTs.map((nft) => ({
            mintAddress: nft.mintAddress,
            tokenId: nft.tokenId,
            name: `Wassieverse #${nft.tokenId}`,
            isLinked: false,
          }));
          setNfts(nftsWithStatus);
        }
      } else {
        // No verified NFTs from current Solana wallet
        setNfts([]);
      }
    } catch (err) {
      // Only show error for unexpected errors
      console.error('Unexpected error in fetchLinkingStatus:', err);
      // Don't set error for empty states - just show empty arrays
      setAllLinkedNFTs([]);
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [verifiedNFTs, evmAddress]);

  // Fetch linking status when EVM address or verified NFTs change
  useEffect(() => {
    if (evmAddress) {
      fetchLinkingStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmAddress, verifiedNFTs?.length]);

  const handleNFTSelect = (tokenId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedTokenIds, tokenId]
      : selectedTokenIds.filter(id => id !== tokenId);
    
    setSelectedTokenIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSelectAllUnlinked = () => {
    const unlinkedTokenIds = nfts
      .filter(nft => !nft.isLinked)
      .map(nft => nft.tokenId);
    
    setSelectedTokenIds(unlinkedTokenIds);
    onSelectionChange(unlinkedTokenIds);
  };

  const handleClearSelection = () => {
    setSelectedTokenIds([]);
    onSelectionChange([]);
  };

  if (loading && !isDisabled) {
    return (
      <Card className={isDisabled ? "opacity-50" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading your Wassieverse NFTs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show error if we have a real error and no data at all
  if (error && allLinkedNFTs.length === 0 && nfts.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600 space-y-2">
            <p className="font-semibold">Error loading NFTs</p>
            <p className="text-sm">{error}</p>
            <Button 
              onClick={fetchLinkingStatus} 
              variant="outline" 
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If disabled, show placeholder
  if (isDisabled) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Your Wassieverse NFTs</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-600 space-y-2">
            <p className="font-semibold">Connect your EVM wallet to view linked NFTs</p>
            <p className="text-sm">Step 1: Connect your EVM wallet above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no NFTs in current wallet and no linked NFTs, show empty state
  if (nfts.length === 0 && allLinkedNFTs.length === 0 && !solanaAddress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600 space-y-2">
            <p className="font-semibold">No NFTs linked yet</p>
            <p className="text-sm">Connect your Solana wallet to verify and link your Wassieverse NFTs.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no NFTs in current wallet but there are linked NFTs, still show them
  if (nfts.length === 0 && allLinkedNFTs.length === 0 && solanaAddress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <p>No Wassieverse NFTs found in this wallet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // NFTs from current Solana wallet
  const unlinkedNFTs = nfts.filter(nft => !nft.isLinked);
  const linkedNFTsFromCurrent = nfts.filter(nft => nft.isLinked);
  
  // All linked NFTs (from any Solana wallet) - filter out duplicates from current wallet
  const allLinkedNFTsFiltered = allLinkedNFTs.filter(linkedNft => 
    !nfts.some(currentNft => currentNft.tokenId === linkedNft.tokenId)
  );

  return (
    <div className={`space-y-6 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Wassieverse NFTs</span>
            <div className="flex space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {allLinkedNFTs.length} Linked
              </Badge>
              {solanaAddress && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {unlinkedNFTs.length} Available
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {unlinkedNFTs.length > 0 && (
              <Button 
                onClick={handleSelectAllUnlinked}
                variant="outline"
                size="sm"
              >
                Select All Unlinked ({unlinkedNFTs.length})
              </Button>
            )}
            {selectedTokenIds.length > 0 && (
              <Button 
                onClick={handleClearSelection}
                variant="outline"
                size="sm"
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Linked NFTs (from any Solana wallet) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-green-600" />
            <span>Already Linked to Your EVM Profile ({allLinkedNFTs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allLinkedNFTs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Show NFTs from current wallet that are linked */}
              {linkedNFTsFromCurrent.map((nft) => (
                <div key={nft.tokenId} className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Wassieverse #{nft.tokenId}</h3>
                      <p className="text-sm text-gray-600">
                        Already linked from this wallet
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      <Link className="h-3 w-3 mr-1" />
                      Linked
                    </Badge>
                  </div>
                </div>
              ))}
              {/* Show NFTs from other wallets that are linked */}
              {allLinkedNFTsFiltered.map((nft) => (
                <div key={nft.tokenId} className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Wassieverse #{nft.tokenId}</h3>
                      <p className="text-sm text-gray-600">
                        {nft.linkedFromSolana && (
                          <span>Linked from: {nft.linkedFromSolana.slice(0, 6)}...{nft.linkedFromSolana.slice(-4)}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      <Link className="h-3 w-3 mr-1" />
                      Linked
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-4">
              <p>No NFTs linked yet. Connect your Solana wallet to link your first NFTs.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available NFTs for Linking */}
      {unlinkedNFTs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Unlink className="h-5 w-5 text-blue-600" />
              <span>Available for Linking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlinkedNFTs.map((nft) => (
                <div key={nft.tokenId} className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedTokenIds.includes(nft.tokenId)}
                      onCheckedChange={(checked) => 
                        handleNFTSelect(nft.tokenId, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">Wassieverse #{nft.tokenId}</h3>
                      <p className="text-sm text-gray-600">Ready to link</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Available
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Selected NFTs */}
      {selectedTokenIds.length > 0 && evmAddress && solanaAddress && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-lg">
                Ready to link <strong>{selectedTokenIds.length}</strong> NFT(s) to your EVM wallet?
              </p>
              <Button 
                onClick={() => onLinkNFTs(selectedTokenIds)}
                disabled={isLinking}
                className="w-full"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking NFTs...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Link Selected NFTs
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
