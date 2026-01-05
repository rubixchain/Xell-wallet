import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import indexDBUtil from '../../indexDB';
import { generateUncompressedPublicKey, deriveKeysFromMnemonic, initiateProxyTransfer } from '../../utils/migration';
import { generateSignature } from '../../utils';
import { config } from '../../../config';
import axios from 'axios';

const MIGRATION_STEPS = {
    PREPARING: 'preparing',
    GENERATING_KEYS: 'generating_keys',
    REQUESTING_DID: 'requesting_did',
    REGISTERING_DID: 'registering_did',
    UPDATING_STORAGE: 'updating_storage',
    COMPLETE: 'complete',
    FAILED: 'failed'
};

const SingleAccountDIDMigration = ({ username, unifiedPassword, onComplete, onError }) => {
    const [currentStep, setCurrentStep] = useState(MIGRATION_STEPS.PREPARING);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [newDid, setNewDid] = useState(null);

    useEffect(() => {
        startMigration();
    }, []);

    const startMigration = async () => {
        try {
            console.log('========== MIGRATION START ==========');
            console.log('[Migration] Starting migration for username:', username);
            console.log('[Migration] UnifiedPassword provided:', !!unifiedPassword);

            setCurrentStep(MIGRATION_STEPS.PREPARING);
            setError(null);
            setProgress(10);

            console.log('[Migration] Calling getDecryptedAccountForDIDMigration...');
            const result = await indexDBUtil.getDecryptedAccountForDIDMigration(username, unifiedPassword);
            console.log('[Migration] getDecryptedAccountForDIDMigration result:', {
                status: result.status,
                alreadyMigrated: result.alreadyMigrated,
                message: result.message,
                hasAccount: !!result.account
            });

            if (!result.status) {
                if (result.alreadyMigrated) {
                    console.log('[Migration] Account already migrated, completing...');
                    await checkAndCompleteFullMigration();
                    onComplete();
                    return;
                }
                throw new Error(result.message || 'Failed to load account');
            }

            console.log('[Migration] Account data retrieved:', {
                username: result.account?.username,
                did: result.account?.did,
                network: result.account?.network,
                publickey: result.account?.publickey?.substring(0, 20) + '...',
                hasPrivateKey: !!result.account?.privateKey,
                privateKeyLength: result.account?.privateKey?.length,
                hasMnemonic: !!result.account?.mnemonic
            });

            await migrateAccount(result.account);
        } catch (err) {
            console.error('[Migration] ERROR:', err.message);
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const migrateAccount = async (account) => {
        try {
            console.log('---------- MIGRATE ACCOUNT ----------');
            console.log('[Migration] OLD DID:', account.did);
            console.log('[Migration] Network:', account.network);

            setCurrentStep(MIGRATION_STEPS.GENERATING_KEYS);
            setProgress(20);

            let newPublicKey;
            let privateKeyHex;

            if (account.mnemonic) {
                console.log('[Migration] Deriving keys from mnemonic...');
                const keys = deriveKeysFromMnemonic(account.mnemonic);
                console.log('[Migration] Keys derived successfully');
                console.log('[Migration] New compressed public key:', keys.compressedPublicKey?.substring(0, 20) + '...');
                console.log('[Migration] Legacy compressed public key:', keys.legacyCompressedPublicKey?.substring(0, 20) + '...');
                console.log('[Migration] New uncompressed public key:', keys.uncompressedPublicKey?.substring(0, 20) + '...');
                console.log('[Migration] Legacy uncompressed public key:', keys.legacyUncompressedPublicKey?.substring(0, 20) + '...');

                const currentPubKey = account.publickey;
                console.log('[Migration] Current stored public key:', currentPubKey?.substring(0, 20) + '...');
                console.log('[Migration] Current pubkey length:', currentPubKey?.length);

                // Check against both compressed and uncompressed keys
                const matchesNewCompressed = currentPubKey === keys.compressedPublicKey;
                const matchesLegacyCompressed = currentPubKey === keys.legacyCompressedPublicKey;
                const matchesNewUncompressed = currentPubKey === keys.uncompressedPublicKey;
                const matchesLegacyUncompressed = currentPubKey === keys.legacyUncompressedPublicKey;

                const matchesNew = matchesNewCompressed || matchesNewUncompressed;
                const matchesLegacy = matchesLegacyCompressed || matchesLegacyUncompressed;

                console.log('[Migration] Matches NEW (compressed):', matchesNewCompressed);
                console.log('[Migration] Matches NEW (uncompressed):', matchesNewUncompressed);
                console.log('[Migration] Matches LEGACY (compressed):', matchesLegacyCompressed);
                console.log('[Migration] Matches LEGACY (uncompressed):', matchesLegacyUncompressed);
                console.log('[Migration] Final - matchesNew:', matchesNew, 'matchesLegacy:', matchesLegacy);

                if (matchesLegacy && !matchesNew) {
                    console.log('[Migration] Using LEGACY keys for migration');
                    newPublicKey = keys.legacyUncompressedPublicKey;
                    privateKeyHex = keys.legacyPrivateKey;
                } else {
                    console.log('[Migration] Using NEW BIP32 keys for migration');
                    newPublicKey = keys.uncompressedPublicKey;
                    privateKeyHex = keys.privateKey;
                }
            } else {
                console.log('[Migration] No mnemonic, using stored private key');
                newPublicKey = generateUncompressedPublicKey(account.privateKey);
                privateKeyHex = account.privateKey;
            }

            console.log('[Migration] Private key hex length:', privateKeyHex?.length);
            console.log('[Migration] Private key hex sample:', privateKeyHex?.substring(0, 10) + '...');

            // Validate private key format
            if (!privateKeyHex || typeof privateKeyHex !== 'string') {
                throw new Error('invalid private key, expected hex or 32 bytes, got ' + typeof privateKeyHex);
            }

            // Ensure privateKeyHex is a clean hex string without spaces or '0x' prefix
            privateKeyHex = privateKeyHex.trim().toLowerCase().replace(/^0x/, '');

            // Validate hex format and length (should be 64 characters for 32 bytes)
            if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
                throw new Error(`invalid private key format: expected 64 hex characters, got ${privateKeyHex.length} characters`);
            }

            console.log('[Migration] Private key validated successfully');

            // Step 2: Request and register new DID on all networks
            setCurrentStep(MIGRATION_STEPS.REQUESTING_DID);
            setProgress(40);

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
                }
            ];

            // Step 3: Register the new DID on all networks
            setCurrentStep(MIGRATION_STEPS.REGISTERING_DID);
            setProgress(50);

            console.log('[Migration] Registering DID on networks:', networks.map(n => n.name));

            const registrationPromises = networks.map(async (network) => {
                try {
                    console.log(`[Migration] [${network.name}] Starting registration...`);
                    const customApi = axios.create({
                        baseURL: network.baseUrl,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    console.log(`[Migration] [${network.name}] Calling /request-did-for-pubkey...`);
                    let didResponse = await customApi.post('/request-did-for-pubkey', {
                        public_key: newPublicKey,
                        network: network.id
                    });
                    didResponse = didResponse.data;
                    console.log(`[Migration] [${network.name}] DID response:`, didResponse?.did);

                    if (!didResponse || !didResponse.did) {
                        console.log(`[Migration] [${network.name}] No DID returned`);
                        return null;
                    }

                    const newDid = didResponse.did;
                    console.log(`[Migration] [${network.name}] NEW DID: ${newDid}`);

                    console.log(`[Migration] [${network.name}] Calling /register-did...`);
                    let registerResponse = await customApi.post('/register-did', { did: newDid });
                    registerResponse = registerResponse.data;
                    console.log(`[Migration] [${network.name}] Register response status:`, registerResponse?.status);

                    if (!registerResponse || !registerResponse.status) {
                        console.log(`[Migration] [${network.name}] Registration failed`);
                        return null;
                    }

                    console.log(`[Migration] [${network.name}] Generating signature for hash:`, registerResponse.result.hash?.substring(0, 20) + '...');
                    const signature = await generateSignature(privateKeyHex, registerResponse.result.hash);
                    console.log(`[Migration] [${network.name}] Calling /signature-response...`);
                    let signatureResponse = await customApi.post('/signature-response', {
                        id: registerResponse.result.id,
                        Signature: { Signature: signature },
                        mode: 4
                    });
                    signatureResponse = signatureResponse.data;
                    console.log(`[Migration] [${network.name}] Signature response status:`, signatureResponse?.status);

                    if (!signatureResponse || !signatureResponse.status) {
                        console.log(`[Migration] [${network.name}] Signature response failed`);
                        return null;
                    }

                    console.log(`[Migration] [${network.name}] Registration SUCCESSFUL! DID: ${newDid}`);
                    return {
                        network: network.id,
                        did: newDid,
                        status: true,
                        baseUrl: network.baseUrl
                    };
                } catch (error) {
                    console.error(`[Migration] [${network.name}] ERROR:`, error.message);
                    return null;
                }
            });

            const registrationResults = await Promise.all(registrationPromises);
            const successfulRegistrations = registrationResults.filter(result => result !== null);
            console.log('[Migration] Successful registrations:', successfulRegistrations.length);

            if (successfulRegistrations.length === 0) {
                throw new Error('Failed to register new DID on any network');
            }

            const generatedNewDid = successfulRegistrations[0].did;
            setNewDid(generatedNewDid);
            console.log('[Migration] Using NEW DID:', generatedNewDid);

            setProgress(70);

            // Step 4: Transfer balance from old DID to new DID (Rubix networks only)
            console.log('---------- BALANCE TRANSFER ----------');
            console.log('[Migration] Account network:', account.network, typeof account.network);
            const rubixNetworks = ['1', '2'];
            const networkStr = String(account.network);
            console.log('[Migration] Is Rubix network:', rubixNetworks.includes(networkStr));

            if (rubixNetworks.includes(networkStr)) {
                try {
                    console.log('[Migration] Checking balance for OLD DID:', account.did);
                    const currentNetworkBaseUrl = getBaseUrlForNetwork(account.network);
                    console.log('[Migration] Network base URL:', currentNetworkBaseUrl);

                    const currentNetworkApi = axios.create({
                        baseURL: currentNetworkBaseUrl,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    console.log('[Migration] Calling /get-account-info...');
                    const accountInfo = await currentNetworkApi.get('/get-account-info', { params: { did: account.did } });
                    console.log('[Migration] Account info response:', JSON.stringify(accountInfo?.data, null, 2));

                    const balance = accountInfo?.data?.account_info?.[0]?.rbt_amount || 0;
                    console.log('[Migration] OLD DID balance:', balance);

                    if (balance > 0) {
                        console.log('[Migration] Initiating PROXY TRANSFER...');
                        console.log('[Migration] From (OLD DID):', account.did);
                        console.log('[Migration] To (NEW DID):', generatedNewDid);
                        console.log('[Migration] Private key hex for transfer:', privateKeyHex?.substring(0, 10) + '...');

                        const transferResult = await initiateProxyTransfer(privateKeyHex, account.did, generatedNewDid);
                        console.log('[Migration] Proxy transfer result:', JSON.stringify(transferResult, null, 2));

                        if (transferResult.success) {
                            console.log('[Migration] PROXY TRANSFER SUCCESS!');
                        } else {
                            console.warn('[Migration] Proxy transfer warning:', transferResult.message);
                        }
                    } else {
                        console.log('[Migration] Balance is 0, skipping transfer');
                    }
                } catch (transferError) {
                    console.error('[Migration] PROXY TRANSFER ERROR:', transferError.message);
                    console.warn('[Migration] Continuing migration despite transfer failure...');
                }
            } else {
                console.log('[Migration] Not a Rubix network, skipping balance transfer');
            }

            // Step 5: Update local storage
            setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
            setProgress(85);

            await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                newDid: generatedNewDid,
                newPublicKey: newPublicKey,
                newPrivateKey: privateKeyHex,
                unifiedPassword: unifiedPassword
            });

            setProgress(90);

            // Step 6: Mark account as fully migrated (only after ALL steps succeed)
            await indexDBUtil.markAccountAsMigrated(account.username);

            setProgress(95);

            // Check if all accounts are now migrated
            await checkAndCompleteFullMigration();

            // Complete
            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            setProgress(100);

            // Notify parent after a short delay
            setTimeout(() => {
                onComplete();
            }, 1000);

        } catch (err) {
            setError(`Failed to migrate account: ${err.message}`);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const checkAndCompleteFullMigration = async () => {
        try {
            const allMigrated = await indexDBUtil.checkAllAccountsMigrated();
            if (allMigrated) {
                // All accounts migrated, set version to 6
                await indexDBUtil.completeDIDMigration();
                console.log('[Migration] All accounts migrated, version set to 6');
            }
        } catch (err) {
            console.warn('[Migration] Failed to check/complete full migration:', err.message);
        }
    };

    const getBaseUrlForNetwork = (network) => {
        const networkId = parseInt(network);
        switch (networkId) {
            case 1:
                return config.RUBIX_MAINNET_BASE_URL;
            case 2:
                return config.RUBIX_TESTNET_BASE_URL;
            case 3:
                return config.TRIE_TESTNET_BASE_URL;
            case 4:
                return config.TRIE_MAINNET_BASE_URL;
            default:
                return config.RUBIX_TESTNET_BASE_URL;
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        await startMigration();
        setIsRetrying(false);
    };

    const getStepLabel = () => {
        switch (currentStep) {
            case MIGRATION_STEPS.PREPARING:
                return 'Preparing migration...';
            case MIGRATION_STEPS.GENERATING_KEYS:
                return 'Generating new keys...';
            case MIGRATION_STEPS.REQUESTING_DID:
                return 'Requesting new DID...';
            case MIGRATION_STEPS.REGISTERING_DID:
                return 'Registering DID on network...';
            case MIGRATION_STEPS.UPDATING_STORAGE:
                return 'Updating local storage...';
            case MIGRATION_STEPS.COMPLETE:
                return 'Migration complete!';
            case MIGRATION_STEPS.FAILED:
                return 'Migration failed';
            default:
                return 'Processing...';
        }
    };

    return (
        <div className="flex flex-col h-full pt-4 pb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${
                    currentStep === MIGRATION_STEPS.COMPLETE
                        ? 'bg-tertiary'
                        : currentStep === MIGRATION_STEPS.FAILED
                            ? 'bg-red-100'
                            : 'bg-tertiary'
                }`}>
                    {currentStep === MIGRATION_STEPS.COMPLETE ? (
                        <FiCheck className="text-secondary" size={24} />
                    ) : currentStep === MIGRATION_STEPS.FAILED ? (
                        <FiX className="text-red-600" size={24} />
                    ) : (
                        <FiRefreshCw className="text-primary animate-spin" size={24} />
                    )}
                </div>
                <div>
                    <h2 className="font-semibold text-xl text-senary">Account Migration</h2>
                    <p className="text-quinary text-sm">{getStepLabel()}</p>
                </div>
            </div>

            {/* Account being migrated */}
            <div className="mb-6 p-4 bg-tertiary/50 rounded-lg border border-secondary/20">
                <p className="text-sm text-quinary mb-1">Migrating account</p>
                <p className="font-medium text-senary">@{username}</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-quinary">Progress</span>
                    <span className="font-medium text-senary">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${
                            currentStep === MIGRATION_STEPS.FAILED
                                ? 'bg-red-500'
                                : currentStep === MIGRATION_STEPS.COMPLETE
                                    ? 'bg-secondary'
                                    : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Migration Steps */}
            <div className="flex-1 space-y-2 mb-4">
                {[
                    { step: MIGRATION_STEPS.PREPARING, label: 'Prepare account data' },
                    { step: MIGRATION_STEPS.GENERATING_KEYS, label: 'Generate new keys' },
                    { step: MIGRATION_STEPS.REQUESTING_DID, label: 'Request new DID' },
                    { step: MIGRATION_STEPS.REGISTERING_DID, label: 'Register on network' },
                    { step: MIGRATION_STEPS.UPDATING_STORAGE, label: 'Update local storage' }
                ].map(({ step, label }, index) => {
                    const stepIndex = Object.values(MIGRATION_STEPS).indexOf(step);
                    const currentIndex = Object.values(MIGRATION_STEPS).indexOf(currentStep);
                    const isComplete = currentIndex > stepIndex || currentStep === MIGRATION_STEPS.COMPLETE;
                    const isCurrent = step === currentStep;
                    const isFailed = currentStep === MIGRATION_STEPS.FAILED && step === currentStep;

                    return (
                        <div
                            key={step}
                            className={`flex items-center gap-3 p-2 rounded-lg ${
                                isComplete ? 'text-secondary' : isCurrent ? 'text-primary' : 'text-gray-400'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isComplete ? 'bg-secondary/10' : isCurrent ? 'bg-primary/10' : 'bg-gray-100'
                            }`}>
                                {isComplete ? (
                                    <FiCheck size={14} />
                                ) : isCurrent ? (
                                    <FiLoader className="animate-spin" size={14} />
                                ) : (
                                    <span className="text-xs">{index + 1}</span>
                                )}
                            </div>
                            <span className="text-sm">{label}</span>
                        </div>
                    );
                })}
            </div>

            {/* New DID display on success */}
            {currentStep === MIGRATION_STEPS.COMPLETE && newDid && (
                <div className="bg-tertiary border border-secondary/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-quinary mb-1">New DID</p>
                    <p className="text-sm text-secondary font-mono truncate">{newDid}</p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Retry button for failed state */}
            {currentStep === MIGRATION_STEPS.FAILED && (
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full bg-secondary hover:bg-primary text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:text-gray-500"
                >
                    {isRetrying ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            Retrying...
                        </span>
                    ) : (
                        'Retry Migration'
                    )}
                </button>
            )}

            {/* Success message */}
            {currentStep === MIGRATION_STEPS.COMPLETE && (
                <div className="text-center">
                    <p className="text-secondary font-medium">Account migrated successfully!</p>
                    <p className="text-sm text-quinary mt-1">Continuing to wallet...</p>
                </div>
            )}
        </div>
    );
};

export default SingleAccountDIDMigration;
