# Unified Password Migration - Implementation Plan

## Overview
Migrate from per-account passwords to a single unified password for all accounts in Xell Wallet.

---

## Phase 1: Storage Structure Updates

### 1.1 Update IndexedDB Structure (`src/indexDB/index.js`)

**Changes Required:**

#### Add new fields to UserDetails:
```javascript
{
  id: 'UserDetails',
  unifiedPassword: null,        // NEW: Global encrypted password
  storageVersion: '3.1',        // NEW: Track migration version
  migrationCompleted: false,     // NEW: Migration flag
  accounts: [...]
}
```

#### New Functions to Add:

**1. Get Storage Version**
```javascript
getStorageVersion: async function() {
  // Check localStorage for storageVersion
  // Return version number or '3.0' (pre-migration default)
}
```

**2. Set Storage Version**
```javascript
setStorageVersion: async function(version) {
  // Set localStorage storageVersion
  // Update IndexedDB storageVersion
}
```

**3. Check If Migration Needed**
```javascript
needsMigration: async function() {
  const version = await this.getStorageVersion();
  const accounts = await this.getData();
  return version < '3.1' && accounts?.data?.length > 0;
}
```

**4. Get All Accounts for Migration**
```javascript
getAllAccountsForMigration: async function() {
  // Return all accounts with username, did, network
  // Used in Screen 2 to display account list
}
```

**5. Validate Multiple Passwords**
```javascript
validateMultiplePasswords: async function(passwordMap) {
  // passwordMap = { username1: password1, username2: password2, ... }
  // Try to decrypt each account's privatekey with provided password
  // Return: { valid: [username1, username2], invalid: [username3] }
}
```

**6. Set Unified Password**
```javascript
setUnifiedPassword: async function(newPassword, oldPasswordMap) {
  // 1. Validate all old passwords first
  // 2. Decrypt each account's privatekey with old password
  // 3. Re-encrypt with new unified password
  // 4. Store unifiedPassword globally (encrypted)
  // 5. Update all accounts with new encrypted privatekeys
  // 6. Set storageVersion to 3.1
  // 7. Delete accounts with invalid passwords
}
```

**7. Validate Unified Password**
```javascript
validateUnifiedPassword: async function(password) {
  // Check password against stored unifiedPassword
  // Return true/false
}
```

**8. Delete Accounts**
```javascript
deleteAccountsByUsername: async function(usernames) {
  // Remove accounts from accounts[] array
  // Delete associated networks, settings, favorites
  // Clean up all related data
}
```

**9. Update Login Validation** (Modify existing `validateAndGetAccount`)
```javascript
validateAndGetAccount: async function(username, password) {
  // Check if unifiedPassword exists
  // If yes: validate against unifiedPassword, then return account
  // If no: use old validation (backward compatibility for mid-migration)
}
```

---

## Phase 2: Migration Screens

### 2.1 Create Migration Screen 1 - Introduction
**File:** `src/pages/migration/MigrationIntro.jsx` (NEW)

**UI Components:**
- Xell logo (centered)
- Heading: "Unified Password Update"
- Description (4 lines max):
  ```
  We're upgrading to a single password for all your accounts.

  You'll need to enter your current password for each account,
  then set one new password that works for all.

  Note: Accounts with forgotten passwords will be removed.
  ```
- "Continue" button → Navigate to Screen 2

### 2.2 Create Migration Screen 2 - Enter Old Passwords
**File:** `src/pages/migration/MigrationPasswords.jsx` (NEW)

**State:**
```javascript
const [accounts, setAccounts] = useState([]);
const [passwords, setPasswords] = useState({}); // { username: password }
const [errors, setErrors] = useState({});
const [isValidating, setIsValidating] = useState(false);
```

**UI Components:**
- Heading: "Enter Account Passwords"
- Description: "Enter the current password for each account"
- List of accounts:
  ```jsx
  {accounts.map(account => (
    <div key={account.username}>
      <label>@{account.username}</label>
      <input
        type="password"
        value={passwords[account.username] || ''}
        onChange={(e) => handlePasswordChange(account.username, e.target.value)}
        error={errors[account.username]}
      />
    </div>
  ))}
  ```
- "Validate" button at bottom

**Functions:**
```javascript
const handleValidate = async () => {
  setIsValidating(true);

  // Call indexDBUtil.validateMultiplePasswords(passwords)
  const result = await indexDBUtil.validateMultiplePasswords(passwords);

  if (result.invalid.length === 0) {
    // All passwords valid → Navigate to Screen 3
    navigate('/migration/set-password', {
      state: { passwords, accounts }
    });
  } else {
    // Show errors for invalid passwords
    setErrors(result.invalid.reduce((acc, username) => ({
      ...acc,
      [username]: 'Invalid password'
    }), {}));
  }

  setIsValidating(false);
};
```

### 2.3 Create Migration Screen 3 - Set New Password
**File:** `src/pages/migration/MigrationSetPassword.jsx` (NEW)

**Props from Navigation State:**
```javascript
const { passwords, accounts } = location.state;
```

**State:**
```javascript
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [error, setError] = useState('');
const [isProcessing, setIsProcessing] = useState(false);
```

**UI Components:**
- Heading: "Set New Unified Password"
- Description: "This password will work for all your accounts"
- New Password input (6 digits PIN)
- Confirm Password input
- "Set Password" button

**Functions:**
```javascript
const handleSetPassword = async () => {
  if (newPassword !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  if (newPassword.length !== 6) {
    setError('Password must be 6 digits');
    return;
  }

  setIsProcessing(true);

  try {
    // Call indexDBUtil.setUnifiedPassword
    const result = await indexDBUtil.setUnifiedPassword(newPassword, passwords);

    if (result.deleted?.length > 0) {
      // Some accounts were deleted due to invalid passwords
      // Show confirmation modal
      setShowDeletedAccountsModal(true);
      setDeletedAccounts(result.deleted);
    } else {
      // All successful, login to first account
      await loginToFirstAccount();
    }
  } catch (error) {
    setError('Failed to set password. Please try again.');
  }

  setIsProcessing(false);
};

const loginToFirstAccount = async () => {
  const firstAccount = accounts[0];
  const accountData = await indexDBUtil.validateAndGetAccount(
    firstAccount.username,
    newPassword
  );

  // Set user context and navigate to dashboard
  setUserDetails(accountData.data);
  setIsUserLoggedIn(true);
  localStorage.setItem('currentUser', JSON.stringify({
    username: firstAccount.username,
    network: firstAccount.network
  }));

  navigate(ROUTES.DASHBOARD, { replace: true });
};
```

### 2.4 Create Deleted Accounts Modal
**File:** `src/components/modals/DeletedAccountsModal.jsx` (NEW)

**Props:**
```javascript
{ isOpen, onClose, deletedAccounts, onContinue }
```

**UI:**
- Heading: "Accounts Deleted"
- Message: "Wrong password entered for:"
- List of deleted account usernames
- Description: "These accounts have been permanently removed."
- "Continue" button → Call onContinue()

---

## Phase 3: App Flow Integration

### 3.1 Update App.jsx
**File:** `src/App.jsx`

**Add Migration Check in useEffect:**
```javascript
useEffect(() => {
  (async () => {
    // Existing code...

    // NEW: Check if migration needed
    const needsMigration = await indexDBUtil.needsMigration();

    if (needsMigration) {
      // Redirect to migration flow
      navigate('/migration/intro', { replace: true });
      return;
    }

    // Existing flow...
  })();
}, []);
```

### 3.2 Add Migration Routes
**File:** `src/App.jsx` (Routes section)

```javascript
// Add new routes
<Route path="/migration/intro" element={<MigrationIntro />} />
<Route path="/migration/passwords" element={<MigrationPasswords />} />
<Route path="/migration/set-password" element={<MigrationSetPassword />} />
```

### 3.3 Update Login Flow for Single Account Users
**File:** `src/pages/login.jsx`

**Modify handleUnlock function:**
```javascript
const handleUnlock = async () => {
  if (pin.length === 6) {
    let res = await indexDBUtil.validateAndGetAccount(selectedUser?.username, pin);

    if (!res?.status) {
      toast.error(res?.message);
      setAttempts(prev => prev - 1);
      if (attempts == 1) {
        navigate(ROUTES.WELCOME, { replace: true });
      }
      return;
    }

    // NEW: Check if this is a single account user needing silent upgrade
    const storageVersion = await indexDBUtil.getStorageVersion();
    if (storageVersion < '3.1') {
      const allAccounts = await indexDBUtil.getData();
      if (allAccounts?.data?.length === 1) {
        // Silent upgrade to unified password
        await indexDBUtil.setUnifiedPasswordForSingleUser(pin);
        await indexDBUtil.setStorageVersion('3.1');
      }
    }

    // Continue with existing login flow...
    toast.success('login success');
    // ... rest of code
  }
};
```

### 3.4 Update Create Wallet Flow
**File:** `src/pages/SetupWallet.jsx` (or wherever wallet creation happens)

**After creating new wallet:**
```javascript
// After wallet creation success
const storageVersion = await indexDBUtil.getStorageVersion();

if (storageVersion >= '3.1') {
  // Use unified password system
  await indexDBUtil.setUnifiedPasswordForNewAccount(password, accountData);
} else {
  // Old system (backward compatibility)
  // Store password per account as before
}
```

---

## Phase 4: Supporting Utilities

### 4.1 Add Helper Functions
**File:** `src/indexDB/index.js`

```javascript
// Helper: Set unified password for single user (silent upgrade)
setUnifiedPasswordForSingleUser: async function(password) {
  const db = await this.initDB();
  const transaction = db.transaction([this.storeName], 'readwrite');
  const store = transaction.objectStore(this.storeName);
  const request = store.get('UserDetails');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const data = request.result;

      // Encrypt and store unified password
      data.unifiedPassword = CryptoJS.AES.encrypt(password, password).toString();
      data.storageVersion = '3.1';

      const updateRequest = store.put(data);
      updateRequest.onsuccess = () => resolve({ status: true });
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
}

// Helper: Set unified password for new account
setUnifiedPasswordForNewAccount: async function(password, accountData) {
  // Check if unifiedPassword already exists
  // If yes: Use it to encrypt new account
  // If no: Set it as unified password
}
```

---

## Phase 5: Testing Checklist

### 5.1 Migration Testing

**Multiple Accounts (Old Users):**
- [ ] App detects version < 3.1
- [ ] Shows Migration Screen 1
- [ ] Displays all accounts on Screen 2
- [ ] Validates all passwords correctly
- [ ] Shows errors for wrong passwords
- [ ] Deletes accounts with wrong passwords
- [ ] Re-encrypts remaining accounts with new password
- [ ] Stores unified password globally
- [ ] Updates storage version to 3.1
- [ ] Logs into first account successfully

**Single Account (Old User):**
- [ ] Normal login flow
- [ ] Silent upgrade happens on successful login
- [ ] Version updated to 3.1
- [ ] No UI changes (seamless)

**New Users (Post-Migration):**
- [ ] Create wallet with password
- [ ] Password stored as unified from start
- [ ] Version 3.1 set automatically
- [ ] All subsequent accounts use same password

### 5.2 Post-Migration Testing

**Account Management:**
- [ ] Create new account uses unified password
- [ ] Switch between accounts works
- [ ] All accounts accessible with unified password
- [ ] Delete account works correctly

**DApp Integration:**
- [ ] Website requests work
- [ ] Transaction approval works
- [ ] Sign-in works with unified password

**Edge Cases:**
- [ ] User closes app mid-migration
- [ ] Network error during migration
- [ ] All passwords wrong (all accounts deleted)
- [ ] Last account deleted scenario

---

## Phase 6: File Structure Summary

### New Files to Create:
```
src/pages/migration/
  ├── MigrationIntro.jsx          (Screen 1)
  ├── MigrationPasswords.jsx      (Screen 2)
  └── MigrationSetPassword.jsx    (Screen 3)

src/components/modals/
  └── DeletedAccountsModal.jsx    (Deleted accounts popup)
```

### Files to Modify:
```
src/indexDB/index.js              (Add 9+ new functions, modify existing)
src/App.jsx                        (Add migration check + routes)
src/pages/login.jsx                (Add silent upgrade for single user)
src/pages/SetupWallet.jsx          (Use unified password for new wallets)
```

### Files to Review:
```
src/context/userContext.jsx        (May need updates for unified password)
src/components/settings/           (Account management with unified password)
```

---

## Phase 7: Implementation Order

### Step 1: Storage Foundation (Day 1)
1. Update `src/indexDB/index.js` with all new functions
2. Test storage functions in isolation
3. Add version tracking (localStorage + IndexedDB)

### Step 2: Migration Screens (Day 2-3)
4. Create MigrationIntro.jsx
5. Create MigrationPasswords.jsx
6. Create MigrationSetPassword.jsx
7. Create DeletedAccountsModal.jsx
8. Style all screens to match existing UI

### Step 3: Integration (Day 4)
9. Update App.jsx with migration check
10. Add migration routes
11. Update login.jsx for single account upgrade
12. Update create wallet flow

### Step 4: Testing & Bug Fixes (Day 5)
13. Test all migration scenarios
14. Test edge cases
15. Fix any issues found
16. Final QA

---

## Phase 8: Rollback Plan

### If Migration Fails:
1. Keep old storage structure as backup
2. Revert to version 3.0
3. User can still access accounts with individual passwords

### Backup Strategy:
- Before migration starts, create backup of UserDetails in IndexedDB
- Store as 'UserDetails_backup_pre_3.1'
- Keep for 30 days post-migration
- Delete after confirmed successful migration

---

## Notes

- All PIN inputs should be 6 digits (existing standard)
- Use existing UI components (PinInput, Card, etc.) for consistency
- Follow existing error handling patterns
- No emojis in code
- Minimal comments (only for complex logic)
- Clean, readable code

---

## Questions to Resolve Before Implementation

1. Should we show a "Back" button on migration screens?
2. What happens if user has 0 accounts? (shouldn't happen but edge case)
3. Should we add a "Skip this time" option? (Answer: NO - force migration)
4. Maximum password length? (Current: 6 digits PIN)
5. Should we send analytics/logs when migration completes?

---

End of Implementation Plan
