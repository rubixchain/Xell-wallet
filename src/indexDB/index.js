import toast from "react-hot-toast";
import * as bip39 from 'bip39';
import { END_POINTS } from "../api/endpoints";
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import secp256k1 from 'secp256k1';
import { generateSignature } from "../utils";
import CryptoJS from 'crypto-js';
import { getConfigPromise } from "../../config";
import { getRegistrationNetworks, getAvailableNetworksForStorage } from "../utils/networkConfig";
import axios from "axios";

// Initialize BIP32 with tiny-secp256k1
const bip32 = BIP32Factory(ecc);

// Helper function to convert hex string to Uint8Array (browser-compatible)
function hexToUint8Array(hexString) {
    if (hexString.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
}

// Helper function to convert Uint8Array to hex string (browser-compatible)
function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}


const indexDBUtil = {
    dbName: 'WalletDB',
    storeName: 'privateKeys',
    version: 1,
    _dbSupported: null,



    // Main database initialization
    initDB: async function () {

        // Use actual IndexedDB if available
        return new Promise((resolve, reject) => {
            try {
                const request = indexedDB.open(this.dbName, this.version);

                request.onerror = (event) => {
                 
                    reject(request.error);
                };

                request.onsuccess = () => resolve(request.result);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'id' });
                    }
                };
            } catch (error) {
            
                reject(error);
            }
        });
    },

    checkUserNameExists: async function (username) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve(false);
                        return;
                    }

                    // Check if username already exists in any account
                    const exists = data.accounts.some(account =>
                        (account?.username && account?.username?.toLowerCase() === username?.toLowerCase())
                    );
                    resolve(exists);
                };
            });
        } catch (error) {
          
            throw error;
        }
    },

    checkPrivateKeyExists: async function (key) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'Recovery key verified successfully' });
                        return;
                    }
                    const privateKeyUint8 = hexToUint8Array(key);
                    const publicKeyUint8 = secp256k1.publicKeyCreate(privateKeyUint8, false);
                    const publicKeyHex = uint8ArrayToHex(publicKeyUint8);

                    // Compare new seed with existing account seeds
                    const exists = data.accounts.some(account => {

                        return account?.publickey == publicKeyHex;
                    });

                    resolve({ status: exists, message: exists ? 'Account already exists' : 'Recovery key verified successfully' });
                };
            });
        } catch (error) {
           
            throw error;
        }
    },
    storeExistingNetworks: async function (did, isMainnet) {
        let db = await this.initDB();
        return new Promise((resolve, reject) => {

            const networkTransaction = db.transaction([this.storeName], 'readwrite');
            const networkStore = networkTransaction.objectStore(this.storeName);

            const availableNetworks = [
                {
                    logo: '/network/rubix.png',
                    name: 'Rubix Mainnet',
                    default: false,
                    selected: false,
                    tokenSymbol: NETWORK_TYPES.RBT,
                    id: 1,
                    rpcUrls: [
                        {
                            selected: true,
                            name: 'mainnet',
                            url: config.RUBIX_MAINNET_BASE_URL
                        }
                    ],
                },
                {
                    logo: '/network/rubix.png',
                    name: 'Rubix Testnet',
                    default: true,
                    selected: !isMainnet,
                    id: 2,
                    tokenSymbol: NETWORK_TYPES.RBT,
                    rpcUrls: [
                        {
                            selected: true,
                            name: 'testnet',
                            url: config.RUBIX_TESTNET_BASE_URL
                        }
                    ],
                },
                {
                    logo: '/network/trie.png',
                    name: 'Trie Testnet',
                    default: true,
                    selected: false,
                    tokenSymbol: NETWORK_TYPES.TRIE,
                    id: 3,
                    rpcUrls: [
                        {
                            selected: true,
                            name: 'testnet',
                            url: config.TRIE_TESTNET_BASE_URL
                        }
                    ],
                },
                {
                    logo: '/network/trie.png',
                    name: 'Trie Mainnet',
                    default: true,
                    selected: false,
                    tokenSymbol: NETWORK_TYPES.TRI,
                    id: 4,
                    rpcUrls: [
                        {
                            selected: true,
                            name: 'mainnet',
                            url: config.TRIE_MAINNET_BASE_URL
                        }
                    ],
                }
            ];

            const getRequest = networkStore.get("NetworkDetails");

            getRequest.onsuccess = () => {
                const existingData = getRequest.result || { id: "NetworkDetails", networks: [] };

                // Add or update the networks for the given DID
                // const didEntry = existingData.networks.find(entry => entry.did === did);
                // if (didEntry) {
                //     didEntry.networks = availableNetworks;
                // } else {
                existingData.networks.push({ did, networks: availableNetworks });
                // }

                const networkPutRequest = networkStore.put(existingData);
                networkPutRequest.onerror = () => reject(networkPutRequest.error);
                networkPutRequest.onsuccess = () => resolve();
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },
    storeNetworks: async function (db, did) {
        return new Promise((resolve, reject) => {
            const networkTransaction = db.transaction([this.storeName], 'readwrite');
            const networkStore = networkTransaction.objectStore(this.storeName);

            const availableNetworks = getAvailableNetworksForStorage();

            const getRequest = networkStore.get("NetworkDetails");

            getRequest.onsuccess = () => {
                const existingData = getRequest.result || { id: "NetworkDetails", networks: [] };

                const seenDids = new Set();
                const uniqueNetworks = existingData.networks.filter(entry => {
                    if (seenDids.has(entry.did)) {
                        return false;
                    }
                    seenDids.add(entry.did);
                    return true;
                });
                existingData.networks = uniqueNetworks;

                const existingIndex = existingData.networks.findIndex(entry => entry.did === did);
                if (existingIndex !== -1) {
                    const networkPutRequest = networkStore.put(existingData);
                    networkPutRequest.onerror = () => reject(networkPutRequest.error);
                    networkPutRequest.onsuccess = () => resolve();
                    return;
                }

                existingData.networks.push({ did, networks: availableNetworks });

                const networkPutRequest = networkStore.put(existingData);
                networkPutRequest.onerror = () => reject(networkPutRequest.error);
                networkPutRequest.onsuccess = () => resolve();
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    storeToDB: async function ({ privatekey, publickey, pin, username, mnemonics, needsLegacyMigration = false, legacyDid = null }) {
        try {
            const hasUnified = await this.hasUnifiedPassword();
            let encryptionPassword = pin;

            if (hasUnified) {
                const isValidUnified = await this.validateUnifiedPassword(pin);
                if (!isValidUnified) {
                    toast.error('PIN must match your existing wallet password');
                    return { status: false, message: 'PIN must match your existing wallet password' };
                }
                encryptionPassword = pin;
            }

            const networks = getRegistrationNetworks();

            const accountPromises = networks.map(async (network) => {
                try {
                    const customApi = axios.create({
                        baseURL: network.baseUrl,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    let res = await customApi.post('/rubix/v1/dids/create', { public_key: publickey, password: encryptionPassword });
                    res = res.data;
                    if (!res || !res.result?.did) {
                        return null;
                    }

                    let registerDid = await customApi.post(`/rubix/v1/dids/${res.result.did}/register`);
                    registerDid = registerDid.data;
                    if (!registerDid || !registerDid?.status) {
                        return null;
                    }

                    let signature = await generateSignature(privatekey, registerDid?.result?.hash);
                    let signatureResponse = await customApi.post('/rubix/v1/signature', {
                        id: registerDid?.result?.id,
                        signature: signature
                    });
                    signatureResponse = signatureResponse.data;

                    if (!signatureResponse || !signatureResponse?.status) {
                        return null;
                    }

                    return {
                        network: network.id,
                        did: res.result.did,
                        status: true,
                        baseUrl: network.baseUrl
                    };
                } catch (error) {
                    return null;
                }
            });

            const results = await Promise.all(accountPromises);
            const successfulAccounts = results.filter(result => result !== null);

            if (successfulAccounts.length === 0) {
                toast.error('Failed to create accounts on any network');
                return { status: false, message: 'Failed to create accounts on any network' };
            }

            const primaryAccount = successfulAccounts.find(acc => acc.network === "1") || successfulAccounts[0];
            const res = primaryAccount;

            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const getRequest = store.get("UserDetails");

                let encryptedPK = CryptoJS.AES.encrypt(privatekey, encryptionPassword).toString();
                let encryptedMnemonics = CryptoJS.AES.encrypt(mnemonics, encryptionPassword).toString();

                getRequest.onsuccess = async () => {
                    const existingData = getRequest.result;
                    const newAccount = {
                        privatekey: encryptedPK,
                        publickey: publickey,
                        username: username,
                        did: res?.did,
                        network: res?.network || "1",
                        createdAt: new Date().toISOString(),
                        mnemonics: encryptedMnemonics
                    };

                    if (legacyDid) {
                        newAccount.legacyDid = legacyDid;
                    }

                    if (needsLegacyMigration) {
                        newAccount.isMigrated = false;
                    } else {
                        newAccount.isMigrated = true;
                    }

                    const objectToStore = {
                        id: "UserDetails",
                        accounts: existingData ?
                            [...(existingData.accounts || []), newAccount] :
                            [newAccount]
                    };

                    const putRequest = store.put(objectToStore);
                    putRequest.onerror = () => reject(putRequest.error);
                    putRequest.onsuccess = async () => {
                        try {
                            await this.storeNetworks(db, res?.did);
                            await this.setCurrentVersion(6);
                            resolve({
                                status: true, data: {
                                    username: username,
                                    did: res?.did,
                                    network: res?.network || "1",
                                    pin: pin,
                                    publickey: publickey,
                                    legacyDid: legacyDid || null
                                }
                            });
                        } catch (error) {
                            reject(error);
                        }
                    };
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {

            throw error;
        }
    },

    savePrivateKey: async function (key, data) {
        try {
            const db = await this.initDB();
            // BIP32 key derivation - correct implementation
            const seed = bip39.mnemonicToSeedSync(data?.originalPhrase);
            const root = bip32.fromSeed(seed);
            const child = root.derivePath("m/0");
            let privateKeyUint8 = child.privateKey;
            if (!secp256k1.privateKeyVerify(privateKeyUint8)) {
                toast.error('invalid private key');
                return;
            }
            // Use uncompressed public key (130 chars) to match Go/Python backend
            const publicKeyUint8 = secp256k1.publicKeyCreate(privateKeyUint8, false);
            let publicKey = uint8ArrayToHex(publicKeyUint8);
            let privateKey = uint8ArrayToHex(privateKeyUint8);


            if (publicKey.length !== 130) {
                toast.error('invalid public key');
                return;
            }

            const isPrivateKeyExists = await this.checkPrivateKeyExists(privateKey);

            if (isPrivateKeyExists?.status) {
                toast.error('Account already exists');
                return;
            }

            // Check if unified password system is already set up
            const hasUnified = await this.hasUnifiedPassword();
            let encryptionPassword = data?.pin;

            if (hasUnified) {
                // Validate that provided PIN matches unified password
                const isValidUnified = await this.validateUnifiedPassword(data?.pin);
                if (!isValidUnified) {
                    toast.error('PIN must match your existing wallet password');
                    return { status: false, message: 'PIN must match your existing wallet password' };
                }
                // Use unified password for encryption
                encryptionPassword = data?.pin;
            }

            // Define networks to create accounts on with their base URLs
            const networks = getRegistrationNetworks();

            // Create accounts on all networks in parallel using custom axios instance
            const accountPromises = networks.map(async (network) => {
                try {
                    const customApi = axios.create({
                        baseURL: network.baseUrl,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    let res = await customApi.post('/rubix/v1/dids/create', { public_key: publicKey, password: encryptionPassword });
                    res = res.data;
                    if (!res || !res.result?.did) {

                        return null;
                    }

                    let registerDid = await customApi.post(`/rubix/v1/dids/${res.result.did}/register`);
                    registerDid = registerDid.data;
                    if (!registerDid || !registerDid?.status) {

                        return null;
                    }

                    let signature = await generateSignature(privateKey, registerDid?.result?.hash);
                    let signatureResponse = await customApi.post('/rubix/v1/signature', {
                        id: registerDid?.result?.id,
                        signature: signature
                    });
                    signatureResponse = signatureResponse.data;

                    if (!signatureResponse || !signatureResponse?.status) {

                        return null;
                    }

                    return {
                        network: network.id,
                        did: res.result.did,
                        status: true,
                        baseUrl: network.baseUrl
                    };
                } catch (error) {

                    return null;
                }
            });

            // Wait for all account creations to complete
            const results = await Promise.all(accountPromises);
            const successfulAccounts = results.filter(result => result !== null);

            if (successfulAccounts.length === 0) {
                toast.error('Failed to create accounts on any network');
                return;
            }


            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // First get existing data
                const getRequest = store.get(key);
                let encryptedPK = CryptoJS.AES.encrypt(privateKey, encryptionPassword).toString();
                let encryptedMnemonics = CryptoJS.AES.encrypt(data?.originalPhrase, encryptionPassword).toString();

                getRequest.onsuccess = () => {
                    const existingData = getRequest.result;
                    const newAccount = {
                        privatekey: encryptedPK,
                        publickey: publicKey,
                        username: data?.username,
                        did: successfulAccounts[0].did,
                        network: successfulAccounts[0].network,
                        createdAt: new Date().toISOString(),
                        mnemonics: encryptedMnemonics,
                        isMigrated: true
                    };

                    const objectToStore = {
                        id: key,
                        accounts: existingData ?
                            [...(existingData.accounts || []), newAccount] :
                            [newAccount]
                    };

                    const putRequest = store.put(objectToStore);
                    putRequest.onerror = () => reject(putRequest.error);
                    putRequest.onsuccess = async () => {
                        // Store networks once for the DID (all accounts share the same DID)
                        await this.storeNetworks(db, newAccount.did);
                        await this.setCurrentVersion(6);
                        resolve({
                            status: true,
                            data: {
                                pin: data?.pin,
                                username: newAccount?.username,
                                did: newAccount?.did,
                                network: newAccount?.network,
                                publickey: newAccount?.publickey,
                            }
                        })
                    };
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {

            throw error;
        }
    },

    updatePassword: async function (id = "UserDetails", username, privatekey, oldPassword, newPassword) {

        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                // First read the existing data
                const readTransaction = db.transaction([this.storeName], 'readonly');
                const store = readTransaction.objectStore(this.storeName);
                const request = store.get(id);

                request.onerror = () => reject(request.error);
                request.onsuccess = async () => {
                    if (!request.result) {
                        resolve(null);
                        return;
                    }

                    try {
                        const userData = request.result;

                        const userIndex = userData.accounts.findIndex(user => user.username === username);
                        if (userIndex === -1) {
                            reject(new Error('User not found'));
                            return;
                        }

                        // Update the password
                        let encryptedPK = CryptoJS.AES.encrypt(privatekey, newPassword).toString();
                        userData.accounts[userIndex].privatekey = encryptedPK;

                        // Fix: Properly handle mnemonics re-encryption with old and new passwords
                        if (userData.accounts[userIndex]?.mnemonics) {
                            try {
                                // First decrypt with OLD password
                                let decryptedMnemonics = CryptoJS.AES.decrypt(userData.accounts[userIndex]?.mnemonics, oldPassword).toString(CryptoJS.enc.Utf8);

                                // Validate decryption was successful
                                if (!decryptedMnemonics) {
                                    throw new Error('Failed to decrypt mnemonics with old password');
                                }

                                // Then encrypt with NEW password
                                let encryptedMnemonics = CryptoJS.AES.encrypt(decryptedMnemonics, newPassword).toString();
                                userData.accounts[userIndex].mnemonics = encryptedMnemonics;
                            } catch (error) {
                                reject(new Error(`Failed to update mnemonics: ${error.message}`));
                                return;
                            }
                        }

                        // Create a new transaction for writing
                        const writeTransaction = db.transaction([this.storeName], 'readwrite');
                        const writeStore = writeTransaction.objectStore(this.storeName);
                        const updateRequest = writeStore.put(userData);

                        updateRequest.onerror = () => reject(updateRequest.error);
                        updateRequest.onsuccess = () => resolve({
                            status: true,
                            message: 'pin updated successfully'
                        });

                    } catch (error) {
                        reject(error);
                    }
                };
            });
        } catch (error) {
           
            throw error;
        }
    },

    encryptData: async function (id = 'UserDetails') {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                request.onerror = () => reject(request.error);

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data?.accounts?.length) {
                        resolve({ status: true, message: 'No data to encrypt' });
                        return;
                    }
                    let updatedData = data.accounts.map((item) => {
                        if (item?.pin) {
                            let encryptedPK = CryptoJS.AES.encrypt(item?.privatekey, item?.pin).toString();
                            return {
                                privatekey: encryptedPK,
                                username: item?.username,
                                network: item?.network,
                                did: item?.did,
                                createdAt: item?.createdAt,
                                publickey: item?.publickey
                            };
                        }
                        return item;
                    });
                    data["accounts"] = updatedData;
                    const writeTransaction = db.transaction([this.storeName], 'readwrite');
                    const writeStore = writeTransaction.objectStore(this.storeName);
                    const updateRequest = writeStore.put(data);
                    updateRequest.onerror = () => reject(updateRequest.error);
                    updateRequest.onsuccess = () => resolve({
                        status: true,
                        message: 'modified successfully'
                    });
                };
            });
        }
        catch (error) {
          
            throw error;
        }
    },

    getData: async function (id = 'UserDetails', value = '', password) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);
                request.onerror = () => reject(request.error);

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    if (!value) {
                        let res = data?.accounts?.map(res => ({ username: res?.username, network: res?.network || "", did: res?.did }));
                        resolve({ status: true, data: res });
                        return;
                    }

                    // Find account matching username
                    const account = data.accounts.find(acc => acc.username === value);

                    if (!account) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    try {
                        const bytes = CryptoJS.AES.decrypt(account?.privatekey, password);
                        let decrypted = bytes.toString(CryptoJS.enc.Utf8);
                        resolve({
                            status: true,
                            privatekey: decrypted
                        });
                    } catch (e) {
                        resolve({ status: false, message: 'invalid details' });
                    }
                };
            });
        } catch (error) {

            throw error;
        }
    },

    getAccountByUsername: async function (username) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve(null);
                        return;
                    }

                    const account = data.accounts.find(acc => acc.username === username);
                    if (!account) {
                        resolve(null);
                        return;
                    }

                    resolve({
                        username: account.username,
                        did: account.did,
                        publickey: account.publickey,
                        network: account.network
                    });
                };
            });
        } catch (error) {
            return null;
        }
    },

    validateAndGetAccount: async function (username, password) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    // Find account matching username
                    const account = data.accounts.find(acc => acc.username === username);

                    if (!account) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }
                    try {
                        const bytes = CryptoJS.AES.decrypt(account?.privatekey, password);
                        let decrypted = bytes.toString(CryptoJS.enc.Utf8);
                        if (decrypted) {
                            resolve({
                                status: true,
                                data: {
                                    publickey: account?.publickey,
                                    pin: password,
                                    username: account.username,
                                    did: account?.did,
                                    network: account?.network,
                                    legacyDid: account?.legacyDid || null
                                }
                            });
                        } else {
                            resolve({ status: false, message: 'Invalid password' });
                        }
                    }
                    catch (e) {
                        resolve({ status: false, message: 'Invalid password' });
                    }
                };
            });
        } catch (error) {
          
            throw error;
        }
    },

    // Store network setting
    storeNetworkSetting: async function (network) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // First get existing settings object or create a new one
                const getRequest = store.get("network");

                getRequest.onsuccess = () => {
                    // Make sure to include the id property
                    const existingSettings = {
                        id: "network",
                        ...network
                    };

                    const putRequest = store.put(existingSettings);
                    putRequest.onerror = (event) => {
                     
                        reject(event.target.error);
                    };
                    putRequest.onsuccess = () => resolve({
                        status: true,
                        message: 'Network setting saved successfully'
                    });
                };

                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
           
            throw error;
        }
    },

    // Get network setting
    getNetworkSetting: async function () {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("network");

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const settings = request.result;
                    if (!settings || !settings.network) {
                        resolve(null); // No network setting found
                        return;
                    }

                    resolve(settings);
                };
            });
        } catch (error) {
            throw error;
        }
    },
    getMnemonics: async function (id = "UserDetails", username, pin) {
        try {
            const db = await this.initDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(id);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    // Find account matching username
                    const account = data.accounts.find(acc => acc.username === username);

                    if (!account) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    // Check if Mnemonics exists for this account
                    if (!account.mnemonics) {
                        resolve({ status: false, message: 'No mnemonics found for this account' });
                        return;
                    }

                    try {
                        // Decrypt the mnemonics using the provided PIN
                        const bytes = CryptoJS.AES.decrypt(account.mnemonics, pin);
                        const decryptedMnemonics = bytes.toString(CryptoJS.enc.Utf8);

                        if (decryptedMnemonics) {
                            resolve({
                                status: true,
                                mnemonics: decryptedMnemonics
                            });
                        } else {
                            resolve({ status: false, message: 'Invalid PIN or corrupted mnemonics' });
                        }
                    } catch (e) {
                         
                        resolve({ status: false, message: 'Failed to decrypt mnemonics' });
                    }
                };
            });
        } catch (error) {
            throw error;
        }
    },
    getNetworksByDID: async function (did) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("NetworkDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.networks) {
                        resolve([]); // No networks found
                        return;
                    }

                    // Filter networks by DID
                    const didEntry = data.networks.find(entry => entry.did === did);
                    if (didEntry) {
                        resolve(didEntry.networks);
                    } else {
                        resolve([]); // No networks found for this DID
                    }
                };
            });
        } catch (error) {
            throw error;
        }
    },
    ensureDefaultNetworksForDID: async function (did) {
        try {
            const existingNetworks = await this.getNetworksByDID(did);
            if (existingNetworks && existingNetworks.length > 0) {
                return { status: true, message: 'Networks already exist' };
            }
            const db = await this.initDB();
            await this.storeNetworks(db, did);
            return { status: true, message: 'Default networks added' };
        } catch (error) {
            return { status: false, message: error.message };
        }
    },
    addNetworkToDID: async function (did, newNetwork) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("NetworkDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result || { id: "NetworkDetails", networks: [] };

                    // Find the entry for the given DID
                    const didEntry = data.networks.find(entry => entry.did === did);
                    if (didEntry) {
                        // Set all existing networks' selected to false
                        didEntry.networks.forEach(net => net.selected = false);
                        // Calculate the new ID based on the current length of the networks array
                        const newId = didEntry.networks.length + 1;
                        // Set default values for the new network
                        const networkToAdd = {
                            ...newNetwork,
                            default: false,
                            selected: true,
                            id: newId,
                            logo: '', // No logo for new networks
                        };
                        // Add the new network to the existing list
                        didEntry.networks.push(networkToAdd);
                    } else {
                        // If the DID does not exist, create a new entry
                        const networkToAdd = {
                            ...newNetwork,
                            default: false,
                            selected: true,
                            id: 1, // Start with ID 1 for new entries
                            logo: '', // No logo for new networks
                        };
                        data.networks.push({ did, networks: [networkToAdd] });
                    }

                    // Update the store with the new network list
                    const updateRequest = store.put(data);
                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                    updateRequest.onsuccess = () => resolve({
                        status: true,
                    });
                };
            });
        } catch (error) {
            throw error;
        }
    },
    changeSelectedNetwork: async function (did, networkId) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("NetworkDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result || { id: "NetworkDetails", networks: [] };
                    const didEntry = data.networks.find(entry => entry.did === did);
                    if (didEntry) {
                        didEntry.networks.forEach(net => {
                            net.selected = (net.id === networkId);
                        });
                        const updateRequest = store.put(data);
                        updateRequest.onerror = () => {
                            reject(updateRequest.error);
                        };
                        updateRequest.onsuccess = () => resolve({
                            status: true,
                            data: didEntry
                        });
                    } else {
                        resolve(); // No entry for this DID, nothing to change
                    }
                };
            });
        } catch (error) {
            throw error;
        }
    },
    updateUserDetailsNetwork: async function (did, network) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve(); // No accounts to update
                        return;
                    }
                    let updated = false;
                    data.accounts = data.accounts.map(account => {
                        if (account.did === did) {
                            updated = true;
                            return { ...account, network: network };
                        }
                        return account;
                    });
                    if (updated) {
                        const updateRequest = store.put(data);
                        updateRequest.onerror = () => {
                            reject(updateRequest.error);
                        };
                        updateRequest.onsuccess = () => resolve();
                    } else {
                        resolve(); // No matching DID found
                    }
                };
            });
        } catch (error) {
            throw error;
        }
    },
    updateSelectedNetwork: async function (did, updatedNetwork) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("NetworkDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result || { id: "NetworkDetails", networks: [] };
                    const didEntry = data.networks.find(entry => entry.did === did);
                    if (didEntry) {
                        let updated = false;
                        didEntry.networks = didEntry.networks.map(net => {
                            if (net.selected) {
                                updated = true;
                                return { ...net, ...updatedNetwork };
                            }
                            return net;
                        });
                        if (updated) {
                            const updateRequest = store.put(data);
                            updateRequest.onerror = () => {
                                reject(updateRequest.error);
                            };
                            updateRequest.onsuccess = () => {
                                const selectedNetwork = didEntry.networks.find(net => net.selected);
                                resolve({
                                    status: true,
                                    data: selectedNetwork
                                });
                            };
                        } else {
                            resolve({ status: false, message: 'No selected network found to update.' });
                        }
                    } else {
                        resolve({ status: false, message: 'No entry for this DID.' });
                    }
                };
            });
        } catch (error) {
            throw error;
        }
    },
    getFTs: async function (did) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("FTDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.fts) {
                        resolve({ status: true, data: { tokens: [] } });
                        return;
                    }

                    // Find entry for this DID
                    const didEntry = data.fts.find(entry => entry.did === did);
                    resolve({
                        status: true,
                        data: didEntry || { tokens: [] }
                    });
                };
            });
        } catch (error) {
            throw error;
        }
    },
    updateFT: async function (did, ftData, isEnabled) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("FTDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result || { id: "FTDetails", fts: [] };
                    const didEntry = data.fts.find(entry => entry.did === did);

                    if (didEntry) {
                        if (isEnabled) {
                            // Add or update token
                            const tokenIndex = didEntry.tokens.findIndex(t => t.ft_name === ftData.ft_name);
                            if (tokenIndex !== -1) {
                                didEntry.tokens[tokenIndex] = ftData;
                            } else {
                                didEntry.tokens.push(ftData);
                            }
                        } else {
                            // Remove token
                            didEntry.tokens = didEntry.tokens.filter(t => t.ft_name !== ftData.ft_name);
                        }
                    } else if (isEnabled) {
                        // Create new entry with token
                        data.fts.push({
                            did,
                            tokens: [ftData]
                        });
                    }

                    const updateRequest = store.put(data);
                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };

                    updateRequest.onsuccess = () => {
                        resolve({
                            status: true,
                            data: didEntry || { tokens: [] }
                        });
                    };
                };
            });
        } catch (error) {
            throw error;
        }
    },
    setCurrentVersion: async function (version = 4) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const request = store.put({
                    id: 'currentVersion',
                    value: version
                });

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve({
                    status: true,
                    message: 'Version stored successfully'
                });
            });
        } catch (error) {
            throw error;
        }
    },

    // Get current version
    getCurrentVersion: async function () {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('currentVersion');

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const data = request.result;
                    resolve({
                        status: true,
                        version: data?.value || null
                    });
                };
            });
        } catch (error) {
            throw error;
        }
    },
    updateUserAccountNetwork: async function (network = 1) {
        // identifier can be username, did, or an object with either
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }


                    data.accounts = data.accounts.map(account => {
                        return {
                            ...account, network
                        };
                    });



                    const updateRequest = store.put(data);
                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                    updateRequest.onsuccess = () => resolve({
                        status: true,
                        message: 'Account network updated successfully',
                        data: data
                    });
                };
            });
        } catch (error) {
            throw error;
        }
    },
    updateNetwork: async function () {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("NetworkDetails");

                request.onerror = () => {
                    reject(request.error);
                };

                request.onsuccess = () => {
                    const data = request.result || { id: "NetworkDetails", networks: [] };

                    data.networks = data.networks.map(didEntry => {
                        return {
                            ...didEntry,
                            networks: didEntry.networks.map((net, index) => {
                                return {
                                    ...net,
                                    tokenSymbol: (index === 0 || index === 1) ? NETWORK_TYPES.RBT : index === 2 ? NETWORK_TYPES.TRIE : NETWORK_TYPES.TRI
                                };
                            })
                        };
                    });

                    const updateRequest = store.put(data);
                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                    updateRequest.onsuccess = () => resolve({
                        status: true,
                        message: 'Network updated successfully',
                        data: data
                    });
                };
            });
        } catch (error) {
            throw error;
        }
    },

    // ==================== MIGRATION FUNCTIONS (COMMENTED OUT FOR V6) ====================

    // /**
    //  * Check if migration is needed (version <= 4)
    //  * @returns {Promise<boolean>}
    //  */
    // needsMigration: async function () {
    //     try {
    //         const currentVersion = await this.getCurrentVersion();
    //         const accounts = await this.getData();

    //         if ((!currentVersion || !currentVersion?.version || currentVersion?.version <= 4) && accounts?.data?.length > 0) {
    //             return true;
    //         }
    //         return false;
    //     } catch (error) {
    //         return false;
    //     }
    // },


    /**
     * Check if a specific account needs DID migration
     * @param {string} username - The username to check
     * @returns {Promise<boolean>}
     */
    accountNeedsDIDMigration: async function (username) {
        try {
            const currentVersion = await this.getCurrentVersion();
            // Check if we're in version 5 or higher (unified password done)
            if (currentVersion?.version < 5) {
                return false;
            }

            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve(false);
                        return;
                    }

                    const account = data.accounts.find(acc => acc.username === username);
                    if (!account) {
                        resolve(false);
                        return;
                    }

                    // Account needs migration if isMigrated is not true
                    resolve(!account.isMigrated);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            return false;
        }
    },

    /**
     * Check if all accounts have been migrated
     * @returns {Promise<boolean>}
     */
    checkAllAccountsMigrated: async function () {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts || data.accounts.length === 0) {
                        resolve(true); // No accounts means nothing to migrate
                        return;
                    }

                    // Check if all accounts have isMigrated set to true
                    const allMigrated = data.accounts.every(acc => acc.isMigrated === true);
                    resolve(allMigrated);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            return false;
        }
    },

    /**
     * Get decrypted account data for single account DID migration
     * @param {string} username
     * @param {string} unifiedPassword
     * @returns {Promise<Object>}
     */
    getDecryptedAccountForDIDMigration: async function (username, unifiedPassword) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;

                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    const account = data.accounts.find(acc => acc.username === username);

                    if (!account) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    if (account.isMigrated) {
                        resolve({ status: false, message: 'Account already migrated', alreadyMigrated: true });
                        return;
                    }

                    try {
                        const pkBytes = CryptoJS.AES.decrypt(account.privatekey, unifiedPassword);
                        const decryptedPrivateKey = pkBytes.toString(CryptoJS.enc.Utf8);

                        let decryptedMnemonic = null;
                        if (account.mnemonics) {
                            const mnBytes = CryptoJS.AES.decrypt(account.mnemonics, unifiedPassword);
                            decryptedMnemonic = mnBytes.toString(CryptoJS.enc.Utf8);
                        }

                        resolve({
                            status: true,
                            account: {
                                username: account.username,
                                did: account.did,
                                network: account.network,
                                publickey: account.publickey,
                                privateKey: decryptedPrivateKey,
                                mnemonic: decryptedMnemonic,
                                legacyDid: account.legacyDid || null
                            }
                        });
                    } catch (e) {
                        resolve({ status: false, message: 'Failed to decrypt account data' });
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Check if unified password system is set up (version >= 5 AND has accounts)
     * @returns {Promise<boolean>}
     */
    hasUnifiedPassword: async function () {
        try {
            const currentVersion = await this.getCurrentVersion();
            if (!currentVersion?.version || currentVersion.version < 5) {
                return false;
            }

            // Also check if there are any accounts to validate against
            const db = await this.initDB();
            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    resolve(data?.accounts?.length > 0);
                };

                request.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    },

    /**
     * Ensure unified password system is set up
     * No-op since we validate via decryption, not hash storage
     * @returns {Promise<boolean>}
     */
    ensureUnifiedPassword: async function () {
        return true;
    },

    /**
     * Get all accounts with full details for migration
     * @returns {Promise<Array>}
     */
    getAllAccountsForMigration: async function () {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve([]);
                        return;
                    }

                    // Return accounts with encrypted data (for validation)
                    const accountList = data.accounts.map(acc => ({
                        username: acc.username,
                        did: acc.did,
                        network: acc.network,
                        publickey: acc.publickey,
                        privatekey: acc.privatekey,  // Encrypted
                        mnemonics: acc.mnemonics,    // Encrypted
                        createdAt: acc.createdAt
                    }));

                    resolve(accountList);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Validate password for a specific account
     * @param {string} username
     * @param {string} password
     * @returns {Promise<Object>} - { valid, decryptedPrivateKey, decryptedMnemonic }
     */
    validateAccountPassword: async function (username, password) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ valid: false, message: 'No accounts found' });
                        return;
                    }

                    const account = data.accounts.find(acc => acc.username === username);
                    if (!account) {
                        resolve({ valid: false, message: 'Account not found' });
                        return;
                    }

                    try {
                        // Decrypt private key
                        const pkBytes = CryptoJS.AES.decrypt(account.privatekey, password);
                        const decryptedPrivateKey = pkBytes.toString(CryptoJS.enc.Utf8);

                        if (!decryptedPrivateKey || decryptedPrivateKey.length === 0) {
                            resolve({ valid: false, message: 'Invalid password' });
                            return;
                        }

                        // Decrypt mnemonic if exists
                        let decryptedMnemonic = null;
                        if (account.mnemonics && account.mnemonics.trim() !== '') {
                            const mnBytes = CryptoJS.AES.decrypt(account.mnemonics, password);
                            decryptedMnemonic = mnBytes.toString(CryptoJS.enc.Utf8);
                        }

                        const hasMnemonics = !!(
                            account.mnemonics &&
                            account.mnemonics.trim() !== '' &&
                            decryptedMnemonic &&
                            decryptedMnemonic.trim() !== ''
                        );

                        resolve({
                            valid: true,
                            decryptedPrivateKey,
                            decryptedMnemonic,
                            hasMnemonics,
                            account: {
                                username: account.username,
                                did: account.did,
                                network: account.network,
                                publickey: account.publickey
                            }
                        });
                    } catch (e) {
                        resolve({ valid: false, message: 'Invalid password' });
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Validate unified password by attempting to decrypt any account's private key
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    validateUnifiedPassword: async function (password) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts || data.accounts.length === 0) {
                        resolve(false);
                        return;
                    }

                    // Try to decrypt the first account's private key
                    const account = data.accounts[0];
                    try {
                        const bytes = CryptoJS.AES.decrypt(account.privatekey, password);
                        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
                        resolve(!!decrypted && decrypted.length > 0);
                    } catch {
                        resolve(false);
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch {
            return false;
        }
    },

    /**
     * Set unified password and re-encrypt all accounts
     * @param {string} newPassword - New unified password
     * @param {Object} accountDataMap - Map of { username: { oldPassword, mnemonic (optional for imports) } }
     * @param {Array} skipAccounts - Array of usernames to skip (delete)
     * @returns {Promise<Object>}
     */
    setUnifiedPassword: async function (newPassword, accountDataMap, skipAccounts = []) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    const migratedAccounts = [];
                    const failedAccounts = [];

                    data.accounts.forEach(account => {
                        // Skip accounts marked for deletion
                        if (skipAccounts.includes(account.username)) {
                            return;
                        }

                        const accountData = accountDataMap[account.username];
                        if (!accountData) {
                            failedAccounts.push(account.username);
                            return;
                        }

                        try {
                            let decryptedPrivateKey;
                            let decryptedMnemonic;

                            if (accountData.mnemonic) {
                                // Account was imported with mnemonic
                                // Derive private key from mnemonic using both methods
                                const seed = bip39.mnemonicToSeedSync(accountData.mnemonic);

                                // NEW BIP32 method (m/0 derivation)
                                const root = bip32.fromSeed(seed);
                                const child = root.derivePath("m/0");
                                const newPrivateKeyBuffer = child.privateKey;
                                const newPrivateKey = newPrivateKeyBuffer.toString('hex');

                                // LEGACY method (first 32 bytes of seed)
                                const legacyPrivateKeyBuffer = seed.slice(0, 32);
                                const legacyPrivateKey = legacyPrivateKeyBuffer.toString('hex');

                                // Generate public keys directly from Buffer objects
                                const newPublicKeyCompressed = Buffer.from(
                                    secp256k1.publicKeyCreate(Uint8Array.from(newPrivateKeyBuffer), true)
                                ).toString('hex');
                                const legacyPublicKeyCompressed = Buffer.from(
                                    secp256k1.publicKeyCreate(Uint8Array.from(legacyPrivateKeyBuffer), true)
                                ).toString('hex');

                                // Check which method matches the account's public key
                                if (account.publickey === legacyPublicKeyCompressed) {
                                    decryptedPrivateKey = legacyPrivateKey;
                                } else if (account.publickey === newPublicKeyCompressed) {
                                    decryptedPrivateKey = newPrivateKey;
                                } else {
                                    // Still try with new key as fallback
                                    decryptedPrivateKey = newPrivateKey;
                                }

                                decryptedMnemonic = accountData.mnemonic;
                            } else {
                                // Decrypt using old password
                                const pkBytes = CryptoJS.AES.decrypt(account.privatekey, accountData.oldPassword);
                                decryptedPrivateKey = pkBytes.toString(CryptoJS.enc.Utf8);

                                if (account.mnemonics) {
                                    const mnBytes = CryptoJS.AES.decrypt(account.mnemonics, accountData.oldPassword);
                                    decryptedMnemonic = mnBytes.toString(CryptoJS.enc.Utf8);
                                }
                            }

                            if (!decryptedPrivateKey || decryptedPrivateKey.length === 0) {
                                failedAccounts.push(account.username);
                                return;
                            }

                            // Re-encrypt with new unified password
                            account.privatekey = CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword).toString();
                            if (decryptedMnemonic) {
                                account.mnemonics = CryptoJS.AES.encrypt(decryptedMnemonic, newPassword).toString();
                            }

                            migratedAccounts.push(account);
                        } catch (e) {
                            failedAccounts.push(account.username);
                        }
                    });

                    if (failedAccounts.length > 0) {
                        resolve({
                            status: false,
                            message: 'Some accounts failed to migrate',
                            failedAccounts
                        });
                        return;
                    }

                    // Update data with migrated accounts only
                    data.accounts = migratedAccounts;

                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => {
                        // Set version to 5 (unified password done, accounts ready for DID migration on-demand)
                        this.setCurrentVersion(5).then(() => {
                            resolve({
                                status: true,
                                migratedAccounts: migratedAccounts.map(acc => acc.username),
                                skippedAccounts: skipAccounts
                            });
                        });
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Update account after DID migration
     * @param {string} username
     * @param {Object} migrationData - { newDid, newPublicKey, newPrivateKey, unifiedPassword }
     * @returns {Promise<Object>}
     */
    updateAccountAfterDIDMigration: async function (username, migrationData) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // Get UserDetails first
                const userDetailsRequest = store.get('UserDetails');

                userDetailsRequest.onsuccess = () => {
                    const data = userDetailsRequest.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    const accountIndex = data.accounts.findIndex(acc => acc.username === username);
                    if (accountIndex === -1) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    const oldDid = data.accounts[accountIndex].did;

                    // Encrypt the new private key with unified password
                    const encryptedNewPrivateKey = CryptoJS.AES.encrypt(
                        migrationData.newPrivateKey,
                        migrationData.unifiedPassword
                    ).toString();

                    // Replace old data with new data completely
                    // Note: isMigrated is NOT set here - it will be set separately after full migration verification
                    // Network is set to 1 (Rubix Mainnet) after migration
                    data.accounts[accountIndex] = {
                        privatekey: encryptedNewPrivateKey,
                        publickey: migrationData.newPublicKey,
                        username: data.accounts[accountIndex].username,
                        did: migrationData.newDid,
                        network: 1,
                        createdAt: data.accounts[accountIndex].createdAt,
                        mnemonics: data.accounts[accountIndex].mnemonics,
                        legacyDid: oldDid
                    };

                    const updateUserDetailsRequest = store.put(data);

                    updateUserDetailsRequest.onsuccess = () => {
                        // Now update NetworkDetails to point to new DID
                        const networkDetailsRequest = store.get('NetworkDetails');

                        networkDetailsRequest.onsuccess = () => {
                            const networkData = networkDetailsRequest.result;
                            if (networkData && networkData.networks) {
                                // Find the network entry for the old DID
                                const oldDidIndex = networkData.networks.findIndex(
                                    entry => entry.did === oldDid
                                );

                                if (oldDidIndex !== -1) {
                                    // Update the DID reference in NetworkDetails
                                    networkData.networks[oldDidIndex].did = migrationData.newDid;

                                    // Update selected network to Rubix Mainnet (id: 1)
                                    if (networkData.networks[oldDidIndex].networks) {
                                        networkData.networks[oldDidIndex].networks.forEach(net => {
                                            net.selected = (net.id === 1);
                                        });
                                    }

                                    const updateNetworkRequest = store.put(networkData);
                                    updateNetworkRequest.onsuccess = () => resolve({ status: true });
                                    updateNetworkRequest.onerror = () => reject(updateNetworkRequest.error);
                                } else {
                                    // Old DID not found in networks, but account update succeeded
                                    resolve({ status: true });
                                }
                            } else {
                                // No network data, but account update succeeded
                                resolve({ status: true });
                            }
                        };

                        networkDetailsRequest.onerror = () => {
                            // Network update failed, but account update succeeded
                            resolve({ status: true });
                        };
                    };

                    updateUserDetailsRequest.onerror = () => reject(updateUserDetailsRequest.error);
                };

                userDetailsRequest.onerror = () => reject(userDetailsRequest.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Mark account as fully migrated by setting isMigrated to true
     * @param {string} username
     * @returns {Promise<Object>}
     */
    markAccountAsMigrated: async function (username) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    const accountIndex = data.accounts.findIndex(acc => acc.username === username);
                    if (accountIndex === -1) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    // Set isMigrated to true
                    data.accounts[accountIndex].isMigrated = true;

                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => resolve({ status: true });
                    updateRequest.onerror = () => reject(updateRequest.error);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Complete DID migration - set version to 5
     * Note: unifiedPasswordHash is preserved for validating new account creation
     * @returns {Promise<Object>}
     */
    completeDIDMigration: async function () {
        try {
            await this.setCurrentVersion(5);
            return { status: true };
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get decrypted account data using unified password
     * @param {string} username
     * @param {string} unifiedPassword
     * @returns {Promise<Object>}
     */
    getDecryptedAccountData: async function (username, unifiedPassword) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    const account = data.accounts.find(acc => acc.username === username);
                    if (!account) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    try {
                        // Decrypt private key
                        const pkBytes = CryptoJS.AES.decrypt(account.privatekey, unifiedPassword);
                        const decryptedPrivateKey = pkBytes.toString(CryptoJS.enc.Utf8);

                        // Decrypt mnemonic
                        let decryptedMnemonic = null;
                        if (account.mnemonics) {
                            const mnBytes = CryptoJS.AES.decrypt(account.mnemonics, unifiedPassword);
                            decryptedMnemonic = mnBytes.toString(CryptoJS.enc.Utf8);
                        }

                        resolve({
                            status: true,
                            data: {
                                username: account.username,
                                did: account.did,
                                network: account.network,
                                publickey: account.publickey,
                                privateKey: decryptedPrivateKey,
                                mnemonic: decryptedMnemonic,
                                legacyDid: account.legacyDid || null
                            }
                        });
                    } catch (e) {
                        resolve({ status: false, message: 'Failed to decrypt account data' });
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get all decrypted accounts for DID migration
     * @param {string} unifiedPassword
     * @returns {Promise<Array>}
     */
    getAllDecryptedAccountsForDIDMigration: async function (unifiedPassword) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found', accounts: [] });
                        return;
                    }

                    const decryptedAccounts = [];

                    for (const account of data.accounts) {
                        try {
                            // Decrypt private key
                            const pkBytes = CryptoJS.AES.decrypt(account.privatekey, unifiedPassword);
                            const decryptedPrivateKey = pkBytes.toString(CryptoJS.enc.Utf8);

                            // Decrypt mnemonic
                            let decryptedMnemonic = null;
                            if (account.mnemonics) {
                                const mnBytes = CryptoJS.AES.decrypt(account.mnemonics, unifiedPassword);
                                decryptedMnemonic = mnBytes.toString(CryptoJS.enc.Utf8);
                            }

                            decryptedAccounts.push({
                                username: account.username,
                                did: account.did,
                                network: account.network,
                                publickey: account.publickey,
                                privateKey: decryptedPrivateKey,
                                mnemonic: decryptedMnemonic
                            });
                        } catch (e) {
                            // If any account fails, return error
                            resolve({
                                status: false,
                                message: `Failed to decrypt account: ${account.username}`,
                                accounts: []
                            });
                            return;
                        }
                    }

                    resolve({
                        status: true,
                        accounts: decryptedAccounts
                    });
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Delete skipped accounts and reset wallet state for fresh start
     * Used when all accounts are skipped during password unification
     * @param {Array} skipAccounts - Array of usernames to delete
     * @returns {Promise<Object>}
     */
    deleteSkippedAccountsAndReset: async function (skipAccounts) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        this.setCurrentVersion(null).then(() => {
                            localStorage.removeItem('currentUser');
                            resolve({ status: true, message: 'No accounts to delete' });
                        });
                        return;
                    }

                    const remainingAccounts = data.accounts.filter(
                        acc => !skipAccounts.includes(acc.username)
                    );

                    if (remainingAccounts.length === 0) {
                        const deleteUserRequest = store.delete('UserDetails');
                        deleteUserRequest.onsuccess = () => {
                            const deleteNetworkRequest = store.delete('NetworkDetails');
                            deleteNetworkRequest.onsuccess = () => {
                                this.setCurrentVersion(null).then(() => {
                                    localStorage.removeItem('currentUser');
                                    resolve({ status: true, message: 'All accounts deleted, wallet reset' });
                                });
                            };
                            deleteNetworkRequest.onerror = () => {
                                this.setCurrentVersion(null).then(() => {
                                    localStorage.removeItem('currentUser');
                                    resolve({ status: true, message: 'Accounts deleted' });
                                });
                            };
                        };
                        deleteUserRequest.onerror = () => reject(deleteUserRequest.error);
                    } else {
                        data.accounts = remainingAccounts;
                        const updateRequest = store.put(data);
                        updateRequest.onsuccess = () => resolve({
                            status: true,
                            message: 'Skipped accounts deleted',
                            remainingAccounts: remainingAccounts.length
                        });
                        updateRequest.onerror = () => reject(updateRequest.error);
                    }
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    /**
     * Manually set legacy DID for already-migrated accounts
     * Use this to fix accounts that were migrated before legacyDid storage was implemented
     * @param {string} username
     * @param {string} legacyDid
     * @returns {Promise<Object>}
     */
    setLegacyDid: async function (username, legacyDid) {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get('UserDetails');

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.accounts) {
                        resolve({ status: false, message: 'No accounts found' });
                        return;
                    }

                    const accountIndex = data.accounts.findIndex(acc => acc.username === username);
                    if (accountIndex === -1) {
                        resolve({ status: false, message: 'Account not found' });
                        return;
                    }

                    data.accounts[accountIndex].legacyDid = legacyDid;

                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => {
                        resolve({ status: true, message: 'Legacy DID added successfully' });
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            throw error;
        }
    },

    cleanupDuplicateNetworks: async function () {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.get("NetworkDetails");

                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.networks || data.networks.length === 0) {
                        resolve({ status: true, message: 'No networks to clean', removed: 0 });
                        return;
                    }

                    const originalCount = data.networks.length;
                    const seenDids = new Set();
                    const uniqueNetworks = data.networks.filter(entry => {
                        if (seenDids.has(entry.did)) {
                            return false;
                        }
                        seenDids.add(entry.did);
                        return true;
                    });

                    const removedCount = originalCount - uniqueNetworks.length;

                    if (removedCount === 0) {
                        resolve({ status: true, message: 'No duplicates found', removed: 0 });
                        return;
                    }

                    data.networks = uniqueNetworks;

                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => {
                        resolve({ status: true, message: `Removed ${removedCount} duplicate entries`, removed: removedCount });
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            return { status: false, message: error.message, removed: 0 };
        }
    },

    clearWalletForNewNetwork: async function () {
        try {
            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                const clearRequest = store.clear();

                clearRequest.onsuccess = async () => {
                    await this.setCurrentVersion(6);
                    localStorage.clear();
                    resolve({ status: true, message: 'Wallet reset for new network' });
                };

                clearRequest.onerror = () => reject(clearRequest.error);
            });
        } catch (error) {
            throw error;
        }
    }
};

export default indexDBUtil;