import toast from "react-hot-toast";
import * as bip39 from 'bip39';
import { END_POINTS } from "../api/endpoints";
import bip32 from 'bip32';
import secp256k1 from 'secp256k1';
import { generateSignature } from "../utils";
import CryptoJS from 'crypto-js';
import { config, NETWORK_TYPES } from "../../config";
import axios from "axios";

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
                    const privateKeyBuffer = Buffer.from(key, 'hex');
                    const publicKeyBuffer = secp256k1.publicKeyCreate(privateKeyBuffer, true);
                    const publicKeyHex = Buffer.from(publicKeyBuffer).toString('hex');

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
                            url: config.RUBIX_MAINNET_BASE_URL
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

            const availableNetworks = [
                {
                    logo: '/network/rubix.png',
                    name: 'Rubix Mainnet',
                    default: true,
                    selected: true,
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
                    selected: false,
                    tokenSymbol: NETWORK_TYPES.RBT,
                    id: 2,
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
                            url: config.RUBIX_MAINNET_BASE_URL
                        }
                    ],
                }
            ];

            const getRequest = networkStore.get("NetworkDetails");

            getRequest.onsuccess = () => {
                const existingData = getRequest.result || { id: "NetworkDetails", networks: [] };
                existingData.networks.push({ did, networks: availableNetworks });

                const networkPutRequest = networkStore.put(existingData);
                networkPutRequest.onerror = () => reject(networkPutRequest.error);
                networkPutRequest.onsuccess = () => resolve();
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    storeToDB: async function ({ privatekey, publickey, pin, username, mnemonics }) {
        try {
            let res = await END_POINTS.create_wallet({ public_key: publickey, network: "1" });

            if (!res) {
                toast.error(res?.message || 'failed to create wallet');
                return;
            }
            let registerDid = await END_POINTS.register_did({ did: res?.did })
            if (!registerDid || !registerDid?.status) {
                toast.error(registerDid?.message || 'failed to register DID');
                return;
            }
            let signature = await generateSignature(privatekey, registerDid?.result?.hash);
            let signatureResponse = await END_POINTS.signature_response({
                id: registerDid?.result?.id,
                Signature: { Signature: signature },
                mode: 4
            });
            if (!signatureResponse || !signatureResponse?.status) {
                toast.error(signatureResponse?.message || 'failed to do response');
                return;
            }

            const db = await this.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                // First get existing data
                const getRequest = store.get("UserDetails");

                let encryptedPK = CryptoJS.AES.encrypt(privatekey, pin).toString();
                let encryptedMnemonics = CryptoJS.AES.encrypt(mnemonics, pin).toString();

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
                            resolve({
                                status: true, data: {
                                    username: username,
                                    did: res?.did,
                                    network: res?.network || "1",
                                    pin: pin,
                                    publickey: publickey,
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
            const result = bip39.mnemonicToSeedSync(data?.originalPhrase);
            let privateKey = result.slice(0, 32);
            if (!secp256k1.privateKeyVerify(privateKey)) {
                toast.error('invalid private key');
                return;
            }
            const publicKeyBuffer = secp256k1.publicKeyCreate(privateKey, true);
            let publicKey = Buffer.from(publicKeyBuffer).toString('hex');
            privateKey = privateKey?.toString('hex');
            if (publicKey.length !== 66) {
                toast.error('invalid private key');
                return;
            }
            const isPrivateKeyExists = await this.checkPrivateKeyExists(privateKey);

            if (isPrivateKeyExists?.status) {
                toast.error('Account already exists');
                return;
            }

            // Define networks to create accounts on with their base URLs
            const networks = [
                {
                    id: "1",
                    name: "RUBIX_MAINNET",
                    baseUrl: config.RUBIX_MAINNET_BASE_URL
                },
                {
                    id: "2",
                    name: "RUBIX_TESTNET",
                    baseUrl: config.RUBIX_TESTNET_BASE_URL
                },
                {
                    id: "3",
                    name: "TRIE_TESTNET",
                    baseUrl: config.TRIE_TESTNET_BASE_URL
                },
                {
                    id: "4",
                    name: "TRIE_MAINNET",
                    baseUrl: config.TRIE_MAINNET_BASE_URL
                }
            ];

            // Create accounts on all networks in parallel using custom axios instance
            const accountPromises = networks.map(async (network) => {
                try {
                    const customApi = axios.create({
                        baseURL: network.baseUrl,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    let res = await customApi.post('/request-did-for-pubkey', { public_key: publicKey, network: network.id });
                    res = res.data;
                    if (!res) {
                       
                        return null;
                    }

                    let registerDid = await customApi.post('/register-did', { did: res?.did });
                    registerDid = registerDid.data;
                    if (!registerDid || !registerDid?.status) {
                       
                        return null;
                    }

                    let signature = await generateSignature(privateKey, registerDid?.result?.hash);
                    let signatureResponse = await customApi.post('/signature-response', {
                        id: registerDid?.result?.id,
                        Signature: { Signature: signature },
                        mode: 4
                    });
                    signatureResponse = signatureResponse.data;

                    if (!signatureResponse || !signatureResponse?.status) {
                        
                        return null;
                    }

                    return {
                        network: network.id,
                        did: res?.did,
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
                let encryptedPK = CryptoJS.AES.encrypt(privateKey, data?.pin).toString();
                let encryptedMnemonics = CryptoJS.AES.encrypt(data?.originalPhrase, data?.pin).toString();

                getRequest.onsuccess = () => {
                    const existingData = getRequest.result;
                    const newAccount = {
                        privatekey: encryptedPK,
                        publickey: publicKey,
                        username: data?.username,
                        did: successfulAccounts[0].did,
                        network: successfulAccounts[0].network,
                        createdAt: new Date().toISOString(),
                        mnemonics: encryptedMnemonics
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
                        // Store networks for all successful accounts with their base URLs
                        for (const account of successfulAccounts) {
                            await this.storeNetworks(db, account.did);
                        }
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
    }
};

export default indexDBUtil;