import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { setCache } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    let address: string;
    
    try {
      const body = await req.json();
      address = body.address;
    } catch (jsonError) {
      // If JSON parsing fails, try to get address from query params
      const url = new URL(req.url);
      address = url.searchParams.get('address') || '';
    }

    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Generate a cryptographically secure random nonce
    const nonce = randomBytes(32).toString("hex");

    // Set expiration to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Store nonce in database
    await prisma.nonce.create({
      data: {
        nonce,
        address,
        expiresAt,
      },
    });

    // Cache nonce in Redis for faster lookups (5 minutes = 300 seconds)
    await setCache(`nonce:${nonce}`, JSON.stringify({ address, expiresAt: expiresAt.toISOString() }), 300);

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Error generating nonce:", error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return NextResponse.json(
      { 
        error: "Failed to generate nonce",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

