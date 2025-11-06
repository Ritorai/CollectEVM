# NFT Linking Protection Mechanisms

This document explains all the security measures in place to prevent relinking NFTs that have already been linked.

## 🛡️ Protection Layers

### Layer 1: Database Constraints (Schema Level)

**Location:** `prisma/schema.prisma` - `LinkedNFT` model

```prisma
@@unique([tokenId]) // Token IDs can only be linked ONCE globally
```

**What it does:**
- Enforces at the database level that each `tokenId` can only exist once in the `LinkedNFT` table
- Prevents duplicate entries even if application logic is bypassed
- **This is the strongest protection** - database will reject any attempt to insert a duplicate tokenId

**Protects against:**
- ✅ Same tokenId being linked to different EVM addresses
- ✅ Same tokenId being relinked after NFT is sold/transferred
- ✅ Race conditions (multiple simultaneous link attempts)
- ✅ Direct database manipulation attempts

### Layer 2: Application-Level Pre-Check

**Location:** `app/api/link-evm/route.ts` (lines 111-137)

```typescript
// 4. Check for already linked NFTs (prevent double-linking)
const alreadyLinkedNFTs = await prisma.linkedNFT.findMany({
  where: {
    tokenId: {
      in: tokenIds
    }
  },
  // ...
});

if (alreadyLinkedNFTs.length > 0) {
  return NextResponse.json({
    error: "NFT already linked",
    details: `Token ID(s) ${linkedTokenIds.join(', ')} are already linked to other wallets`,
    alreadyLinked: linkedTokenIds
  }, { status: 409 });
}
```

**What it does:**
- Checks if any of the tokenIds being linked are already in the database
- Returns a clear error message before attempting to create database entries
- Provides user-friendly feedback about which tokenIds are already linked

**Protects against:**
- ✅ Attempting to link NFTs that are already linked
- ✅ Provides clear error messages to users

### Layer 3: Server-Side Ownership Verification

**Location:** `app/api/link-evm/route.ts` (lines 88-105)

```typescript
// 3. Re-verify Solana NFT ownership server-side
nfts = await getWassieverseNFTs(solanaAddress);

if (nfts.length === 0) {
  return NextResponse.json({
    error: "No Wassieverse NFTs found. Ownership may have changed."
  }, { status: 404 });
}
```

**What it does:**
- Re-queries the Solana blockchain to verify the wallet still owns the NFTs
- Only links NFTs that are currently owned by the Solana address
- Prevents linking NFTs that have been sold/transferred away

**Protects against:**
- ✅ Linking NFTs that were sold before the link attempt
- ✅ Linking NFTs that were transferred to another wallet

## 📊 Protection Flow

```
User tries to link NFT
    ↓
1. Server verifies NFT ownership (Layer 3)
    ↓ (NFT must be owned by Solana wallet)
2. Application checks if tokenId already linked (Layer 2)
    ↓ (Must not exist in database)
3. Database constraint enforces uniqueness (Layer 1)
    ↓ (Database rejects if duplicate)
✅ NFT successfully linked
```

## 🔒 What Each Protection Prevents

### Scenario 1: NFT Sold After Linking
**Protection:** ✅ **PREVENTED**
- TokenId is already in database (Layer 1 & 2)
- New owner cannot relink the same tokenId
- Database constraint will reject the insert

### Scenario 2: NFT Transferred to New Wallet
**Protection:** ✅ **PREVENTED**
- Same tokenId cannot be linked again (Layer 1 & 2)
- Even if new owner tries to link, it will fail

### Scenario 3: Same NFT, Different EVM Address
**Protection:** ✅ **PREVENTED**
- TokenId uniqueness constraint (Layer 1)
- Application check (Layer 2)
- Cannot link same tokenId to a different EVM address

### Scenario 4: Race Condition (Simultaneous Links)
**Protection:** ✅ **PREVENTED**
- Database unique constraint (Layer 1) is atomic
- First insert succeeds, second fails with constraint violation

### Scenario 5: NFT Sold Before Linking
**Protection:** ✅ **PREVENTED**
- Server-side ownership check (Layer 3)
- If NFT is not owned by the Solana wallet, linking fails

## ⚠️ Important Notes

### What Happens When an NFT is Sold?

1. **Before Linking:** 
   - If NFT is sold, ownership check (Layer 3) will fail
   - Linking attempt will be rejected
   - ✅ Protected

2. **After Linking:**
   - TokenId is already in database
   - New owner cannot relink (Layer 1 & 2)
   - ✅ Protected - tokenId remains linked to original EVM address

### Current Behavior

**Once a tokenId is linked, it CANNOT be relinked:**
- ✅ Even if the NFT is sold to a new wallet
- ✅ Even if transferred to a different Solana address
- ✅ Even if someone tries to link it to a different EVM address

**This is by design** - tokenIds are meant to be linked once and stay linked to prevent fraud.

## 🔍 How to Verify Protections

### Test 1: Try to Link Same TokenId Twice
```bash
# First link (should succeed)
POST /api/link-evm
{ tokenIds: ["564"], ... }

# Second link attempt (should fail)
POST /api/link-evm  
{ tokenIds: ["564"], ... }
# Expected: 409 Conflict - "NFT already linked"
```

### Test 2: Check Database Constraint
```sql
-- Try to insert duplicate tokenId (should fail)
INSERT INTO "LinkedNFT" (tokenId, ...) VALUES ('564', ...);
-- Expected: Unique constraint violation
```

### Test 3: Query Already Linked NFTs
```sql
-- See which tokenIds are already linked
SELECT "tokenId", "evmAddress", "solanaAddress" 
FROM "LinkedNFT";
```

## 📝 Summary

**Current Protections:**
1. ✅ **Database unique constraint** on `tokenId` - prevents duplicates at DB level
2. ✅ **Application pre-check** - checks before attempting insert
3. ✅ **Server-side ownership verification** - ensures NFT is owned before linking

**Result:**
- TokenIds can only be linked **once, globally**
- Cannot be relinked even if NFT is sold/transferred
- Protection enforced at multiple layers for maximum security

