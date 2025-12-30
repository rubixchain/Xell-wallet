# Testing Migration Flow

## Setup Test Environment

### Option 1: Fresh Test (Recommended for first test)

1. **Clear existing data:**
   - Go to `chrome://extensions/`
   - Find Xell extension
   - Click "Remove" to uninstall
   - Go to `chrome://indexeddb-internals/`
   - Delete any WalletDB databases
   - Clear localStorage: Open any site, F12, Console, run: `localStorage.clear()`

2. **Load old version (v4):**
   - Switch to branch: `git checkout chrome-extstable`
   - Build: `npm run build`
   - Load unpacked extension from `dist/` folder
   - Create 2-3 test accounts with different PINs
   - Note down the usernames and PINs

3. **Load new version (v6 with migration):**
   - Switch to branch: `git checkout feat/DID-migration`
   - Build: `npm run build`
   - Go to `chrome://extensions/`
   - Click "Reload" button on Xell extension (or Remove and load unpacked again)
   - Open popup - should show Migration Modal

### Option 2: Using Test Script (After initial setup)

1. **Open extension popup**
2. **Open DevTools** (right-click on popup → Inspect)
3. **Go to Console tab**
4. **Run:**
   ```javascript
   // Import the test helper
   import('/src/utils/testMigration.js').then(m => {
     window.setupTestData = m.setupTestData;
     window.clearTestData = m.clearTestData;
     window.checkMigrationState = m.checkMigrationState;
   });

   // Setup test data (creates v4 accounts)
   setupTestData();

   // Check current state
   checkMigrationState();

   // Clear all data (when you want to reset)
   clearTestData();
   ```

## Testing the Migration Flow

### Phase 1: Unified Password Migration

1. **Open popup** - should show "Account Migration Required" modal
2. **For each account:**
   - Enter the PIN you used when creating the account
   - Click "Validate PIN"
   - Should show green checkmark if correct
   - OR check "Skip this account" to delete it
   - OR click "Import with Recovery Phrase" to enter 24-word mnemonic

3. **After all accounts handled:**
   - Click "Next: Set Unified Password"
   - Enter new 6-digit unified password (will be used for all accounts)
   - Confirm password
   - Click "Complete Migration"

4. **Lock wallet:**
   - Click "Lock Wallet" button
   - Extension should return to login screen

### Phase 2: DID Migration

1. **Login with unified password:**
   - Enter the unified password you just set
   - Click "Unlock"
   - Should automatically detect DID migration is needed

2. **DID migration process:**
   - Shows progress for each account:
     - Preparing...
     - Generating new keys...
     - Requesting new DID from backend...
     - Registering DID...
     - Updating storage...
     - Complete ✓

3. **Success:**
   - All accounts should migrate successfully
   - Shows "Migration Complete!" message
   - Automatically logs you in

4. **If migration fails:**
   - Shows error message
   - Click "Retry Migration"
   - All-or-nothing: if one fails, all are rolled back

## Debugging Issues

### Popup shows blank/white screen

**Check Service Worker console:**
1. Go to `chrome://extensions/`
2. Find Xell extension
3. Click "service worker" (or "background page")
4. Look for JavaScript errors

**Check popup console:**
1. Right-click on extension popup
2. Click "Inspect"
3. Go to Console tab
4. Look for errors

**Common issues:**
- **IndexedDB version conflict:** Clear data and try again
- **Build issue:** Run `npm run build` again
- **Module loading error:** Check if all assets are in dist/assets/
- **CSP error:** Check manifest.json has `'wasm-unsafe-eval'`

### Migration modal doesn't show

**Check version:**
```javascript
// In popup console
indexedDB.open('WalletDB', 1).onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction(['privateKeys'], 'readonly');
  const store = tx.objectStore('privateKeys');
  store.get('currentVersion').onsuccess = (ev) => {
    console.log('Current version:', ev.target.result);
  };
};
```

**Expected:**
- Version ≤ 4: Should show unified password migration modal
- Version = 5: Should show DID migration after login
- Version ≥ 6: No migration needed

### Migration fails with "Invalid PIN"

- Make sure you're entering the exact PIN used when creating the account
- PINs are case-sensitive and must be 6 digits
- If forgotten, use "Skip this account" or "Import with Recovery Phrase"

### DID migration fails

**Check backend connectivity:**
- Make sure backend is running
- Check network in Settings
- Check RPC URL is correct

**Check console for errors:**
- Look for API call failures
- Check if public key format is correct (should be 130 hex chars for uncompressed)

## Manual Cleanup

**Clear all extension data:**
```javascript
// In popup console
indexedDB.deleteDatabase('WalletDB');
localStorage.clear();
chrome.storage.local.clear();
```

**Then reload extension:**
- Go to `chrome://extensions/`
- Click "Reload" on Xell extension
