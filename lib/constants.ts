/**
 * Application-wide constants
 */

// Nonce expiration time in milliseconds (5 minutes)
export const NONCE_EXPIRATION_MS = 5 * 60 * 1000;

// Maximum number of NFTs to display
export const MAX_NFTS_DISPLAY = 100;

// Solana Token Program ID
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

// API endpoints
export const API_ENDPOINTS = {
  NONCE: "/api/nonce",
  VERIFY_SOLANA: "/api/verify-solana",
  LINK_EVM: "/api/link-evm",
} as const;

// External links
export const EXTERNAL_LINKS = {
  SOLSCAN_ACCOUNT: (address: string) => `https://solscan.io/account/${address}`,
  SOLSCAN_TOKEN: (mint: string) => `https://solscan.io/token/${mint}`,
  ETHERSCAN_ADDRESS: (address: string) => `https://etherscan.io/address/${address}`,
  HELIUS: "https://helius.dev",
  QUICKNODE: "https://quicknode.com",
  WALLETCONNECT: "https://cloud.walletconnect.com",
} as const;

