import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const DEFAULT_RATE_LIMIT = Number(
  process.env.NFT_LINKSTATUS_RATE_LIMIT ?? 20
);
const DEFAULT_RATE_WINDOW_SECONDS = Number(
  process.env.NFT_LINKSTATUS_RATE_WINDOW ?? 60
);

function getClientIdentifier(req: NextRequest): string {
  const headerIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return req.ip ?? headerIp ?? "unknown";
}

export async function POST(req: NextRequest) {
  const clientId = getClientIdentifier(req);
  const rateLimitKey = `nft-linkstatus:${clientId}`;

  const rateLimitResult = checkRateLimit(rateLimitKey, {
    limit: DEFAULT_RATE_LIMIT,
    windowSeconds: DEFAULT_RATE_WINDOW_SECONDS,
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many checks from this address. Please wait a moment before trying again.",
        resetAt: new Date(rateLimitResult.reset).toISOString(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(
            Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
            0
          ).toString(),
        },
      }
    );
  }

  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("tokenId" in payload)
  ) {
    return NextResponse.json(
      { error: "tokenId is required" },
      { status: 400 }
    );
  }

  const rawTokenId = (payload as { tokenId: unknown }).tokenId;
  const tokenIdNumber =
    typeof rawTokenId === "string" && rawTokenId.trim() !== ""
      ? Number(rawTokenId)
      : typeof rawTokenId === "number"
        ? rawTokenId
        : NaN;

  if (
    !Number.isInteger(tokenIdNumber) ||
    tokenIdNumber < 0 ||
    tokenIdNumber > 2999
  ) {
    return NextResponse.json(
      { error: "tokenId must be an integer between 0 and 2999" },
      { status: 400 }
    );
  }

  const tokenId = tokenIdNumber.toString();

  try {
    const linkedNFT = await prisma.linkedNFT.findUnique({
      where: {
        tokenId,
      },
      select: {
        evmAddress: true,
        solanaAddress: true,
        linkedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tokenId,
        isLinked: Boolean(linkedNFT),
        linkedTo: linkedNFT?.evmAddress ?? null,
        solanaAddress: linkedNFT?.solanaAddress ?? null,
        linkedAt: linkedNFT?.linkedAt?.toISOString() ?? null,
        remainingChecks: rateLimitResult.remaining,
      },
    });
  } catch (error) {
    console.error("Error checking NFT link status:", error);
    return NextResponse.json(
      { error: "Failed to check link status" },
      { status: 500 }
    );
  }
}


