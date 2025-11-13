'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link } from 'lucide-react';

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
  const [statusCheckComplete, setStatusCheckComplete] = useState(false); // Track if status check has completed successfully

  // Debug: Log when solanaAddress or verifiedNFTs changes - REMOVED nfts to prevent infinite loop
  const verifiedNFTsKey = verifiedNFTs.map(n => n.tokenId).join(',');

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
            const linkedNFTsList: NFT[] = (profileData.data.nfts || []).map((nft: { mintAddress: string; tokenId: string; solanaAddress: string }) => ({
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
            setStatusCheckComplete(true); // Mark status check as complete
          } else {
            // If status check failed, don't mark as complete - don't show NFTs as available
            console.error('Status check failed:', linkingStatusResponse.status);
            setStatusCheckComplete(false);
            setNfts([]);
          }
        } catch (statusErr) {
          console.error('Error fetching NFT status:', statusErr);
          // If status check fails, don't show NFTs as available - wait for retry
          setStatusCheckComplete(false);
          setNfts([]);
        }
      } else {
        // Clear NFTs if no verified NFTs (but keep if solanaAddress exists and we're just waiting)
        if (!solanaAddress || verifiedNFTs.length === 0) {
          setNfts([]);
          setStatusCheckComplete(false);
        }
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
  }, [verifiedNFTs, evmAddress, solanaAddress]);

  // Reset status check completion when verifiedNFTs changes
  useEffect(() => {
    setStatusCheckComplete(false);
  }, [verifiedNFTsKey]);

  // Fetch linking status when EVM address or verified NFTs change
  // Only refetch if verifiedNFTs actually changes (not just length, but content)
  useEffect(() => {
    if (evmAddress) {
      fetchLinkingStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmAddress, verifiedNFTsKey, fetchLinkingStatus]);

  // Calculate derived values for display (before early returns)
  // Filter out NFTs that are already linked (check both allLinkedNFTs and nfts state)
  // CRITICAL: Only show NFTs as "available" if we've successfully checked their linking status
  const unlinkedVerifiedNFTs = verifiedNFTs.filter(nft => {
    // Check if linked in allLinkedNFTs (linked to this EVM address)
    const isLinkedInProfile = allLinkedNFTs.some(linked => linked.tokenId === nft.tokenId);
    if (isLinkedInProfile) return false; // Already linked to this EVM
    
    // Only proceed if status check has completed successfully
    if (!statusCheckComplete || nfts.length === 0) {
      return false; // Status check not complete - don't show as available
    }
    
    // Check if linked globally (from API status check)
    const nftStatus = nfts.find(n => n.tokenId === nft.tokenId);
    const isLinkedGlobally = nftStatus?.isLinked || false;
    
    // NFT is available only if:
    // 1. NOT linked in profile (this EVM)
    // 2. NOT linked globally (any EVM)
    // 3. Status check has completed successfully
    return !isLinkedGlobally;
  });

  // Only show NFTs if status check has completed successfully
  const nftsToShow = statusCheckComplete && nfts.length > 0
    ? unlinkedVerifiedNFTs
    : [];

  // Only show "Available for Linking" section if:
  // 1. We have verifiedNFTs
  // 2. Status check has completed successfully
  // 3. There are actually unlinked NFTs to show
  const shouldShowAvailableSection = verifiedNFTs.length > 0 && statusCheckComplete && nftsToShow.length > 0;

  // Debug log only when verifiedNFTs changes (moved here to be before early returns)
  const handleNFTSelect = (tokenId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...selectedTokenIds, tokenId]
      : selectedTokenIds.filter(id => id !== tokenId);
    
    setSelectedTokenIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSelectAllUnlinked = () => {
    // Get unlinked NFTs from verifiedNFTs
    const unlinkedNFTs = verifiedNFTs.filter(nft => {
      const isLinked = allLinkedNFTs.some(linked => linked.tokenId === nft.tokenId);
      return !isLinked;
    });
    
    // Use unlinked NFTs if available, otherwise use all verifiedNFTs
    const nftsToSelect = unlinkedNFTs.length > 0 ? unlinkedNFTs : verifiedNFTs;
    const tokenIdsToSelect = nftsToSelect.map(nft => nft.tokenId);
    
    setSelectedTokenIds(tokenIdsToSelect);
    onSelectionChange(tokenIdsToSelect);
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
          <div className="text-center text-red-400 space-y-2">
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
              <div className="text-center text-[#A0A0A0] space-y-2">
                <p className="font-semibold">Connect your EVM wallet to view linked NFTs</p>
                <p className="text-sm">Step 1: Connect your EVM wallet above</p>
              </div>
            </CardContent>
          </Card>
        );
      }


  return (
    <div className={`space-y-6 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Your Wassieverse NFTs - Combined view */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Wassieverse NFTs</span>
            <div className="flex space-x-2">
                  <Badge variant="outline" className="bg-[#1a3a1a] text-[#34C759] border-[#34C759]/30">
                    {allLinkedNFTs.length} Linked
                  </Badge>
                  {shouldShowAvailableSection && (
                    <Badge variant="outline" className="bg-[#2a1a3a] text-[#B066FF] border-[#B066FF]/30">
                      {nftsToShow.length > 0 ? nftsToShow.length : verifiedNFTs.length} Available
                    </Badge>
                  )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Available for Linking NFTs Section - ALWAYS show if we have verifiedNFTs - ABOVE Already Linked */}
            {shouldShowAvailableSection && (
              <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#A0A0A0]">Available for Linking</h3>
                  <div className="flex space-x-2">
                    {nftsToShow.length > 0 && (
                      <Button 
                        onClick={handleSelectAllUnlinked}
                        variant="outline"
                        size="sm"
                      >
                        Select All ({nftsToShow.length})
                      </Button>
                    )}
                    {selectedTokenIds.length > 0 && (
                      <Button 
                        onClick={handleClearSelection}
                        variant="outline"
                        size="sm"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Show verifiedNFTs directly if nftsToShow is empty (shouldn't happen, but safety) */}
                  {(nftsToShow.length > 0 ? nftsToShow : verifiedNFTs).map((nft) => {
                    return (
                      <div key={nft.tokenId} className="border rounded-xl p-4 bg-[#1a1a2a] border-[#B066FF]/30 relative card-depth hover:border-[#B066FF]/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedTokenIds.includes(nft.tokenId)}
                            onCheckedChange={(checked) => 
                              handleNFTSelect(nft.tokenId, checked as boolean)
                            }
                            className="absolute top-2 right-2"
                          />
                          <div className="flex-1 pr-8">
                            <h3 className="font-semibold">Wassieverse #{nft.tokenId}</h3>
                            <p className="text-sm text-gray-600">Ready to link</p>
                          </div>
                              <Badge variant="outline" className="bg-[#2a1a3a] text-[#B066FF] border-[#B066FF]/50">
                                Available
                              </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Linked NFTs Section - BELOW Available for Linking */}
            {allLinkedNFTs.length > 0 && (
              <div>
                    <h3 className="text-sm font-semibold text-[#A0A0A0] mb-3">Already Linked</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allLinkedNFTs.map((nft) => (
                    <div key={nft.tokenId} className="border rounded-xl p-4 bg-[#1a2a1a] border-[#34C759]/30 card-depth">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Wassieverse #{nft.tokenId}</h3>
                              <p className="text-sm text-[#A0A0A0]">
                                {nft.linkedFromSolana && (
                                  <span>Linked from: {nft.linkedFromSolana.slice(0, 6)}...{nft.linkedFromSolana.slice(-4)}</span>
                                )}
                              </p>
                        </div>
                            <Badge variant="outline" className="bg-[#1a3a1a] text-[#34C759] border-[#34C759]/50">
                              <Link className="h-3 w-3 mr-1" />
                              Linked
                            </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State - Only show if we truly have no NFTs AND no Solana wallet is verified */}
                {allLinkedNFTs.length === 0 && verifiedNFTs.length === 0 && !loading && !solanaAddress && (
                  <div className="text-center text-[#A0A0A0] py-8">
                    <p>No Wassieverse NFTs found.</p>
                    <p className="text-sm mt-2">Connect your Solana wallet and verify NFT ownership to see your NFTs here.</p>
                  </div>
                )}
                {/* Show different message if wallet is verified but no NFTs */}
                {allLinkedNFTs.length === 0 && verifiedNFTs.length === 0 && !loading && solanaAddress && (
                  <div className="text-center text-[#A0A0A0] py-8">
                    <p>No Wassieverse NFTs found in this wallet.</p>
                    <p className="text-sm mt-2">Try connecting a different Solana wallet.</p>
                  </div>
                )}
          </div>
        </CardContent>
      </Card>

      {/* Link Selected NFTs Button - Show when NFTs are selected */}
      {selectedTokenIds.length > 0 && evmAddress && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-lg">
                Ready to link <strong>{selectedTokenIds.length}</strong> NFT(s) to your EVM wallet?
              </p>
              {solanaAddress ? (
                    <p className="text-sm text-[#34C759] font-semibold">
                      ✓ Solana wallet verified: {solanaAddress.slice(0, 6)}...{solanaAddress.slice(-4)}
                    </p>
              ) : (
                    <p className="text-sm text-[#FFA500] font-semibold">
                      Please verify your Solana wallet first
                    </p>
              )}
              <Button 
                onClick={() => onLinkNFTs(selectedTokenIds)}
                disabled={isLinking || !solanaAddress}
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
