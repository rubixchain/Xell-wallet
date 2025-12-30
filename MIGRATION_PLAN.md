# DID Migration Implementation Plan

## Overview

Migrate wallets from compressed public keys (old DIDs) to uncompressed public keys (new DIDs) for all wallets where `version <= 4`. After migration, `newDid` becomes the active DID and tokens from `oldDid` are transferred to `newDid`.

---

## Current State Analysis

### Existing Version System
- Current version stored as `{ id: 'currentVersion', value: 4 }`
- Version 3 → 4 migration exists in `utils.js:updateVersion()`
- Version is set during login and wallet setup

### Current Account Structure (IndexedDB)
```javascript
{
  id: "UserDetails",
  accounts: [{
    privatekey: "AES-encrypted",
    publickey: "130 hex chars (uncompressed)",
    username: string,
    did: string,
    network: "1|2|3|4",
    createdAt: timestamp,
    mnemonics: "AES-encrypted"
  }]
}
```

### Key Derivation (Current - Already Correct)
- Path: `m/0` (matches Go/Python)
- Public key: Uncompressed (130 hex chars)
- Recent commits fixed this for NEW wallets

### Problem
OLD wallets (version <= 4) may have DIDs derived from compressed public keys. These need migration to uncompressed-based DIDs.

---

## Implementation Plan

### Phase 1: Database Schema Update

#### 1.1 Add Migration Fields to Account Structure
**File:** `src/indexDB/index.js`

Add new fields to account structure:
```javascript
{
  // Existing fields...
  oldDid: string | null,        // Previous DID (compressed-based)
  migrationStatus: string,       // 'pending' | 'completed' | 'failed'
  migratedAt: timestamp | null,  // When migration completed
  version: number               // Per-account version (5 = migrated)
}
```

#### 1.2 Add New IndexDB Functions
**File:** `src/indexDB/index.js`

```javascript
// Get account with full details including encrypted data
getAccountByUsername: async function(username, pin)

// Update account after migration
updateAccountAfterMigration: async function(username, { newDid, newPublicKey, oldDid })

// Check if account needs migration
checkMigrationRequired: async function(username)
```

---

### Phase 2: Migration Service

#### 2.1 Create Migration Utility
**New File:** `src/utils/migration.js`

```javascript
// Core migration functions
export const MIGRATION_VERSION = 5;
export const MIGRATION_MODE = 99; // Special mode identifier for migration transactions

// Check if migration is required
export async function isMigrationRequired(version) {
  return version <= 4;
}

// Generate compressed public key (old method) for comparison
export function generateCompressedPublicKey(privateKeyBuffer) {
  return secp256k1.publicKeyCreate(privateKeyBuffer, true); // compressed
}

// Generate uncompressed public key (new method)
export function generateUncompressedPublicKey(privateKeyBuffer) {
  return secp256k1.publicKeyCreate(privateKeyBuffer, false); // uncompressed
}

// Request new DID from backend
export async function requestNewDid(publicKey, network, baseUrl)

// Transfer tokens from oldDid to newDid
export async function migrateTokens(oldDid, newDid, privateKey, network, baseUrl)

// Full migration flow
export async function performMigration({
  mnemonic,
  privateKey,
  pin,
  username,
  oldDid,
  network
})
```

---

### Phase 3: API Endpoints

#### 3.1 Add Migration Endpoint
**File:** `src/api/endpoints.js`

```javascript
// Token migration endpoint
migrate_tokens: (params) => {
  // params: { old_did, new_did, signature }
  return api.post('migrate-tokens', params)
}

// Check if DID exists on network
check_did_exists: (params) => {
  // params: { did }
  return api.post('check-did', params)
}
```

---

### Phase 4: Migration Modal Component

#### 4.1 Create Migration Modal
**New File:** `src/components/migration/MigrationModal.jsx`

```jsx
// States: 'info' | 'migrating' | 'success' | 'error'
// Shows:
// - Info screen explaining migration
// - Progress indicator during migration
// - Success/failure result
// - Retry button on failure
```

#### 4.2 Migration Progress Component
**New File:** `src/components/migration/MigrationProgress.jsx`

```jsx
// Shows step-by-step progress:
// 1. Generating new keys...
// 2. Requesting new DID...
// 3. Registering DID...
// 4. Migrating tokens...
// 5. Updating local storage...
```

---

### Phase 5: Login Flow Integration

#### 5.1 Modify Login Page
**File:** `src/pages/Login.jsx`

```javascript
// After PIN validation:
const handleUnlock = async () => {
  // 1. Validate PIN (existing)
  let res = await indexDBUtil.validateAndGetAccount(selectedUser?.username, pin)

  // 2. Check version for migration
  const accountVersion = await indexDBUtil.getAccountVersion(selectedUser?.username)

  if (accountVersion <= 4) {
    // 3. Show migration modal
    setShowMigrationModal(true)
    setMigrationData({
      username: selectedUser?.username,
      pin: pin,
      accountData: res?.data
    })
    return
  }

  // 4. Normal login flow (existing)
  // ...
}

// Migration completion handler
const handleMigrationComplete = async (result) => {
  if (result.success) {
    // Update user details with new DID
    setUserDetails({
      ...result.data,
      did: result.newDid
    })
    // Navigate to dashboard
    navigate(routes.DASHBOARD, { replace: true })
  } else {
    // Show error, allow retry
    toast.error(result.error)
  }
}
```

---

### Phase 6: Import Wallet Flow Integration

#### 6.1 Modify Import Wallet
**File:** `src/pages/ImportWallet.jsx`

```javascript
const handleContinue = async () => {
  // 1. Validate mnemonic (existing)

  // 2. Generate BOTH compressed and uncompressed public keys
  const compressedPubKey = generateCompressedPublicKey(privatekey)
  const uncompressedPubKey = generateUncompressedPublicKey(privatekey)

  // 3. Check if OLD DID exists on any network
  const oldDid = await checkOldDidExists(compressedPubKey)

  if (oldDid) {
    // 4. Navigate to setup with migration flag
    navigate(routes.SETUP_WALLET, {
      state: {
        type: 'import',
        publickey: uncompressedPubKey,
        privatekey,
        mnemonics: trimed,
        requiresMigration: true,
        oldDid: oldDid
      }
    })
  } else {
    // 5. Normal import flow (new wallet)
    navigate(routes.SETUP_WALLET, {
      state: {
        type: 'import',
        publickey: uncompressedPubKey,
        privatekey,
        mnemonics: trimed
      }
    })
  }
}
```

#### 6.2 Modify SetupWallet for Migration
**File:** `src/pages/SetupWallet.jsx`

After wallet setup completes, if `requiresMigration` flag is set:
1. Show migration modal
2. Perform token migration
3. Store newDid as primary

---

### Phase 7: Transaction Filtering

#### 7.1 Add Migration Mode Constant
**File:** `src/utils/constants.js`

```javascript
export const MIGRATION_TX_MODE = 99; // Special mode for migration transactions
```

#### 7.2 Update Dashboard Transaction Filter
**File:** `src/pages/Dashboard.jsx`

```javascript
// Current filter (line 73):
const transactions = transactionsApiData?.TxnDetails
  ?.filter(res => res?.Mode == 0 || res?.Mode == 1)

// Updated filter:
const transactions = transactionsApiData?.TxnDetails
  ?.filter(res =>
    (res?.Mode == 0 || res?.Mode == 1) &&
    res?.Mode !== MIGRATION_TX_MODE  // Exclude migration transactions
  )
```

#### 7.3 Update History Page Filter
**File:** `src/pages/History.jsx`

Apply same migration transaction filter.

---

### Phase 8: Edge Cases

#### 8.1 No Tokens Under oldDid
- Still generate newDid
- Still register DID on network
- Skip token migration API call
- Set version = 5

#### 8.2 Migration Failure
- Do NOT update version
- Do NOT switch to newDid
- Keep oldDid as active
- Allow user to retry
- Log error for debugging

#### 8.3 Partial Migration (Multi-Network)
- Track migration status per network
- Allow partial success (some networks migrated)
- Retry failed networks

---

### Phase 9: Version Update Flow

#### 9.1 Update Version Utility
**File:** `src/utils.js`

```javascript
export const updateVersion = async (version = 5) => {
  const currentVersion = await indexDBUtil.getCurrentVersion();

  // Existing 3→4 migration
  if (currentVersion?.version == 3 && version == 4) {
    // ...existing code...
  }

  // New 4→5 migration (DID migration)
  // This is handled separately through MigrationModal
  // Just update version after successful migration
  if (currentVersion?.version == 4 && version == 5) {
    await indexDBUtil.setCurrentVersion(version);
  }
}
```

---

## File Changes Summary

### New Files
1. `src/utils/migration.js` - Migration logic and utilities
2. `src/components/migration/MigrationModal.jsx` - Migration UI modal
3. `src/components/migration/MigrationProgress.jsx` - Progress indicator

### Modified Files
1. `src/indexDB/index.js` - New functions for migration
2. `src/api/endpoints.js` - Migration API endpoints
3. `src/pages/Login.jsx` - Migration check and modal trigger
4. `src/pages/ImportWallet.jsx` - Old DID detection
5. `src/pages/SetupWallet.jsx` - Migration flow for imports
6. `src/pages/Dashboard.jsx` - Filter migration transactions
7. `src/pages/History.jsx` - Filter migration transactions
8. `src/utils.js` - Version update for migration
9. `src/utils/constants.js` - Migration constants
10. `src/context/userContext.jsx` - Migration state (optional)

---

## Implementation Order

1. **Database Layer** (indexDB functions)
2. **Migration Utility** (src/utils/migration.js)
3. **API Endpoints** (endpoints.js)
4. **Migration Modal UI** (MigrationModal.jsx)
5. **Login Flow Integration** (Login.jsx)
6. **Import Flow Integration** (ImportWallet.jsx, SetupWallet.jsx)
7. **Transaction Filtering** (Dashboard.jsx, History.jsx)
8. **Testing & Edge Cases**

---

## Questions for Clarification

1. **Backend API**: Is the `/migrate-tokens` endpoint already implemented? What's the exact request/response format?

2. **Migration Mode**: What is the exact `Mode` value the backend uses for migration transactions?

3. **Multi-Network**: Should migration happen on all 4 networks simultaneously, or only the currently selected network?

4. **Rollback**: If migration fails after tokens are transferred but before local storage updates, how should we handle recovery?

5. **Unified Password**: You mentioned moving to unified password - should the migration also prepare for this (e.g., storing password hash differently)?
