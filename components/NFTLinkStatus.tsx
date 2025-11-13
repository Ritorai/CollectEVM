"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

const MIN_TOKEN_ID = 0;
const MAX_TOKEN_ID = 2999;

type StatusType = "idle" | "available" | "linked" | "error";

interface StatusState {
  type: StatusType;
  message: string;
  detail?: string | null;
}

interface LinkStatusResponse {
  success: boolean;
  data?: {
    tokenId: string;
    isLinked: boolean;
    linkedTo: string | null;
    solanaAddress: string | null;
    linkedAt: string | null;
    remainingChecks?: number | null;
  };
  error?: string;
  resetAt?: string;
}

function shortenAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getStatusStyles(type: StatusType): string {
  switch (type) {
    case "available":
      return "border-[#34C759]/40 bg-[#112412] text-[#d4f7d9]";
    case "linked":
      return "border-[#B066FF]/40 bg-[#2a1a3a] text-[#E9D9FF]";
    case "error":
      return "border-red-500/40 bg-[#2a1111] text-red-300";
    default:
      return "border-[#2a2a2a] bg-[#161616] text-[#d4d4d4]";
  }
}

export function NFTLinkStatus() {
  const [tokenInput, setTokenInput] = useState("");
  const [status, setStatus] = useState<StatusState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [remainingChecks, setRemainingChecks] = useState<number | null>(null);

  const description = useMemo(
    () => "Check if a specific Wassieverse NFT Token ID is already linked.",
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmed = tokenInput.trim();

      if (trimmed === "") {
        setStatus({
          type: "error",
          message: "Please enter a token ID.",
        });
        return;
      }

      const parsedTokenId = Number.parseInt(trimmed, 10);

      if (
        Number.isNaN(parsedTokenId) ||
        !Number.isInteger(parsedTokenId) ||
        parsedTokenId < MIN_TOKEN_ID ||
        parsedTokenId > MAX_TOKEN_ID
      ) {
        setStatus({
          type: "error",
          message: `Token ID must be a whole number between ${MIN_TOKEN_ID} and ${MAX_TOKEN_ID}.`,
        });
        return;
      }

      setIsChecking(true);
      setStatus(null);
      setResetAt(null);
      setRemainingChecks(null);

      try {
        const response = await fetch("/api/nft-linkstatus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tokenId: parsedTokenId }),
        });

        const data: LinkStatusResponse = await response.json().catch(() => ({
          success: false,
          error: "Unexpected response from server.",
        }));

        if (response.status === 429) {
          setStatus({
            type: "error",
            message:
              data.error ??
              "Rate limit reached. Please wait a moment before trying again.",
          });
          setResetAt(data.resetAt ?? null);
          return;
        }

        if (!response.ok || !data.success || !data.data) {
          setStatus({
            type: "error",
            message: data.error ?? "Failed to check link status.",
          });
          return;
        }

        setRemainingChecks(
          typeof data.data.remainingChecks === "number"
            ? data.data.remainingChecks
            : null
        );

        if (data.data.isLinked) {
          const linkedTo = shortenAddress(data.data.linkedTo);
          const linkedFrom = shortenAddress(data.data.solanaAddress);
          const detailParts = [
            linkedTo ? `Linked to EVM: ${linkedTo}` : null,
            linkedFrom ? `Linked from Solana: ${linkedFrom}` : null,
          ].filter(Boolean);

          setStatus({
            type: "linked",
            message: `Token #${data.data.tokenId} is already linked.`,
            detail: detailParts.length > 0 ? detailParts.join(" • ") : null,
          });
        } else {
          setStatus({
            type: "available",
            message: `Token #${data.data.tokenId} has not been linked yet.`,
            detail: "No existing link was found for this token ID.",
          });
        }
      } catch (error) {
        console.error("Error checking NFT link status:", error);
        setStatus({
          type: "error",
          message: "Something went wrong while checking the token. Please try again.",
        });
      } finally {
        setIsChecking(false);
      }
    },
    [tokenInput]
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">NFT Linkstatus</CardTitle>
        <p className="text-sm text-[#A0A0A0]">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="tokenId" className="sr-only">
              Token ID
            </label>
            <input
              id="tokenId"
              inputMode="numeric"
              pattern="[0-9]*"
              min={MIN_TOKEN_ID}
              max={MAX_TOKEN_ID}
              placeholder={`Enter a token ID (${MIN_TOKEN_ID}-${MAX_TOKEN_ID})`}
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#121212] px-4 py-3 text-white placeholder:text-[#5c5c5c] focus:border-[#B066FF] focus:outline-none focus:ring-2 focus:ring-[#B066FF]/40"
            />
            <Button
              type="submit"
              disabled={isChecking}
              className="sm:w-32"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check
                </>
              )}
            </Button>
          </div>
        </form>

        {remainingChecks !== null && (
          <p className="text-xs text-[#6e6e6e]">
            Checks remaining in this window: {remainingChecks}
          </p>
        )}

        {resetAt && (
          <p className="text-xs text-[#ff9a9a]">
            You can try again after {new Date(resetAt).toLocaleTimeString()}.
          </p>
        )}

        {status && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${getStatusStyles(
              status.type
            )}`}
          >
            <p className="font-semibold">{status.message}</p>
            {status.detail && (
              <p className="mt-1 text-xs text-[#c4c4c4]">{status.detail}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


