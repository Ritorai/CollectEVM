/**
 * Custom error classes for better error handling
 */

export class WalletNotConnectedError extends Error {
  constructor(message = "Wallet not connected") {
    super(message);
    this.name = "WalletNotConnectedError";
  }
}

export class SignatureVerificationError extends Error {
  constructor(message = "Signature verification failed") {
    super(message);
    this.name = "SignatureVerificationError";
  }
}

export class NonceError extends Error {
  constructor(message = "Invalid or expired nonce") {
    super(message);
    this.name = "NonceError";
  }
}

export class NFTVerificationError extends Error {
  constructor(message = "NFT verification failed") {
    super(message);
    this.name = "NFTVerificationError";
  }
}

export class NoNFTsFoundError extends Error {
  constructor(message = "No Wassieverse NFTs found in wallet") {
    super(message);
    this.name = "NoNFTsFoundError";
  }
}

export class DatabaseError extends Error {
  constructor(message = "Database operation failed") {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Check if error is a user-cancelled action
 */
export function isUserCancelledError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("user rejected") ||
      message.includes("user denied") ||
      message.includes("cancelled") ||
      message.includes("canceled")
    );
  }
  return false;
}

