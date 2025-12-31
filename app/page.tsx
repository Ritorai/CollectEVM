"use client";

import Image from "next/image";
import { NFTLinkStatus } from "@/components/NFTLinkStatus";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#121212] to-[#1a0a1f] dark">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header - Logo */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="Wassieverse NFT Wallet Linker"
                width={400}
                height={100}
                className="h-auto w-auto max-w-full"
                priority
              />
            </div>
          </div>

          {/* Information Message */}
          <div className="text-center">
            <p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto font-semibold">
              NFT TO EVM WALLET LINKER IS CLOSED, YOU CAN STILL CHECK IF YOUR LINKED YOUR NFTS BELOW
            </p>
          </div>

          {/* NFT Link Status */}
          <NFTLinkStatus />
        </div>
      </div>
    </div>
  );
}