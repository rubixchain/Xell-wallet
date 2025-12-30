/**
 * Test Migration Helper
 *
 * Run this in browser console to set up test data for migration testing.
 *
 * Usage:
 * 1. Open the extension popup
 * 2. Open DevTools (right-click → Inspect)
 * 3. Go to Console tab
 * 4. Copy and paste the setupTestData() function
 * 5. Run: setupTestData()
 * 6. Close and reopen the extension
 */

import CryptoJS from 'crypto-js';

// Test accounts with different PINs
const TEST_ACCOUNTS = [
    {
        username: 'test_user_1',
        pin: '123456',
        did: 'bafybmi_test_did_1_compressed',
        network: '1',
        // This is a test mnemonic - DO NOT USE IN PRODUCTION
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
    },
    {
        username: 'test_user_2',
        pin: '654321',
        did: 'bafybmi_test_did_2_compressed',
        network: '2',
        mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
    }
];

/**
 * Setup test data for migration testing
 * This creates accounts with version 4 (pre-migration state)
 */
export async function setupTestData() {
    const dbName = 'WalletDB';
    const storeName = 'privateKeys';

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Create test accounts
            const accounts = TEST_ACCOUNTS.map(acc => {
                // Generate a fake private key (32 bytes hex)
                const fakePrivateKey = '0'.repeat(64);

                // Encrypt with the account's PIN
                const encryptedPK = CryptoJS.AES.encrypt(fakePrivateKey, acc.pin).toString();
                const encryptedMnemonic = CryptoJS.AES.encrypt(acc.mnemonic, acc.pin).toString();

                return {
                    privatekey: encryptedPK,
                    publickey: '02' + '0'.repeat(64), // Fake compressed public key (66 chars)
                    username: acc.username,
                    did: acc.did,
                    network: acc.network,
                    createdAt: new Date().toISOString(),
                    mnemonics: encryptedMnemonic
                };
            });

            // Store UserDetails (NO unifiedPassword = old format)
            const userDetails = {
                id: 'UserDetails',
                accounts: accounts
                // Note: No 'unifiedPassword' field - this is pre-migration state
            };

            store.put(userDetails);

            // Set version to 4 (pre-migration)
            store.put({
                id: 'currentVersion',
                value: 4
            });

            // Add network details for each account
            const networkDetails = {
                id: 'NetworkDetails',
                networks: TEST_ACCOUNTS.map(acc => ({
                    did: acc.did,
                    networks: [
                        {
                            logo: '/network/rubix.png',
                            name: 'Rubix Mainnet',
                            default: true,
                            selected: acc.network === '1',
                            tokenSymbol: 'RBT',
                            id: 1,
                            rpcUrls: [{ selected: true, name: 'mainnet', url: 'https://mainnet.example.com' }]
                        },
                        {
                            logo: '/network/rubix.png',
                            name: 'Rubix Testnet',
                            default: true,
                            selected: acc.network === '2',
                            tokenSymbol: 'RBT',
                            id: 2,
                            rpcUrls: [{ selected: true, name: 'testnet', url: 'https://testnet.example.com' }]
                        }
                    ]
                }))
            };

            store.put(networkDetails);

            transaction.oncomplete = () => {
                resolve(true);
            };

            transaction.onerror = () => reject(transaction.error);
        };
    });
}

/**
 * Clear all test data
 */
export async function clearTestData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('WalletDB');
        request.onsuccess = () => {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('storageVersion');
            resolve(true);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Check current migration state
 */
export async function checkMigrationState() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WalletDB', 1);

        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['privateKeys'], 'readonly');
            const store = transaction.objectStore('privateKeys');

            const versionReq = store.get('currentVersion');
            const userReq = store.get('UserDetails');

            transaction.oncomplete = () => {
                const version = versionReq.result?.value || 'not set';
                const hasUnifiedPassword = !!userReq.result?.unifiedPassword;
                const accountCount = userReq.result?.accounts?.length || 0;

                resolve({ version, hasUnifiedPassword, accountCount });
            };
        };

        request.onerror = () => reject(request.error);
    });
}

// Export for console usage
if (typeof window !== 'undefined') {
    window.setupTestData = setupTestData;
    window.clearTestData = clearTestData;
    window.checkMigrationState = checkMigrationState;
}
