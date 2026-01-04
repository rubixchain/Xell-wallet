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
            setCurrentStep(MIGRATION_STEPS.PREPARING);
            setError(null);
            setProgress(10);

            // Get decrypted account data for the specific account
            const result = await indexDBUtil.getDecryptedAccountForDIDMigration(username, unifiedPassword);

            if (!result.status) {
                if (result.alreadyMigrated) {
                    // Account already migrated, complete immediately
                    await checkAndCompleteFullMigration();
                    onComplete();
                    return;
                }
                throw new Error(result.message || 'Failed to load account');
            }

            await migrateAccount(result.account);
        } catch (err) {
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const migrateAccount = async (account) => {
        try {
            // Step 1: Generate new keys
            setCurrentStep(MIGRATION_STEPS.GENERATING_KEYS);
            setProgress(20);

            let newPublicKey;
            let privateKeyHex;

            if (account.mnemonic) {
                // Derive from mnemonic - try new method first, fallback to legacy
                const keys = deriveKeysFromMnemonic(account.mnemonic);

                // Check if current public key matches new or legacy key
                const currentPubKey = account.publickey;
                const matchesNew = currentPubKey === keys.compressedPublicKey;
                const matchesLegacy = currentPubKey === keys.legacyCompressedPublicKey;

                if (matchesLegacy && !matchesNew) {
                    // Use legacy keys for this account
                    newPublicKey = keys.legacyUncompressedPublicKey;
                    privateKeyHex = keys.legacyPrivateKey;
                } else {
                    // Use new BIP32 keys
                    newPublicKey = keys.uncompressedPublicKey;
                    privateKeyHex = keys.privateKey;
                }
            } else {
                // Generate from existing private key
                newPublicKey = generateUncompressedPublicKey(account.privateKey);
                privateKeyHex = account.privateKey;
            }

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

            // Step 2: Request new DID from backend
            setCurrentStep(MIGRATION_STEPS.REQUESTING_DID);
            setProgress(40);

            // Get the appropriate base URL for the network
            const baseUrl = getBaseUrlForNetwork(account.network);
            const customApi = axios.create({
                baseURL: baseUrl,
                headers: { 'Content-Type': 'application/json' }
            });

            let didResponse = await customApi.post('/request-did-for-pubkey', {
                public_key: newPublicKey,
                network: account.network
            });
            didResponse = didResponse.data;

            if (!didResponse || !didResponse.did) {
                throw new Error('Failed to get new DID from server');
            }

            const generatedNewDid = didResponse.did;
            setNewDid(generatedNewDid);

            // Step 3: Register the new DID
            setCurrentStep(MIGRATION_STEPS.REGISTERING_DID);
            setProgress(60);

            let registerResponse = await customApi.post('/register-did', { did: generatedNewDid });
            registerResponse = registerResponse.data;

            if (!registerResponse || !registerResponse.status) {
                throw new Error('Failed to register new DID');
            }

            // Sign the registration
            const signature = await generateSignature(privateKeyHex, registerResponse.result.hash);
            let signatureResponse = await customApi.post('/signature-response', {
                id: registerResponse.result.id,
                Signature: { Signature: signature },
                mode: 4
            });
            signatureResponse = signatureResponse.data;

            if (!signatureResponse || !signatureResponse.status) {
                throw new Error('Failed to complete DID registration');
            }

            setProgress(75);

            // Step 4: Transfer balance from old DID to new DID via proxy (silent)
            try {
                console.log('[Migration] Initiating proxy balance transfer:', { from: account.did, to: generatedNewDid });

                // Get account balance first to check if transfer is needed
                const accountInfo = await customApi.get('/get-account-info', { params: { did: account.did } });
                const balance = accountInfo?.data?.account_info?.[0]?.rbt_amount || 0;

                if (balance > 0) {
                    // Use proxy transfer with ECIES encryption - proxy handles the full balance
                    const transferResult = await initiateProxyTransfer(privateKeyHex, account.did, generatedNewDid);
                    if (transferResult.success) {
                        console.log('[Migration] Proxy balance transfer completed successfully', transferResult.data);
                    } else {
                        console.warn('[Migration] Proxy balance transfer warning:', transferResult.message);
                    }
                } else {
                    console.log('[Migration] No balance to transfer, skipping');
                }
            } catch (transferError) {
                console.warn('[Migration] Proxy balance transfer failed (continuing migration):', transferError.message);
            }

            // Step 5: Update local storage
            setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
            setProgress(90);

            await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                newDid: generatedNewDid,
                newPublicKey: newPublicKey,
                oldDid: account.did,
                oldPublicKey: account.publickey
            });

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
