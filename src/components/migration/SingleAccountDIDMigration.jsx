import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheck, FiX, FiLoader, FiClipboard, FiAlertCircle } from 'react-icons/fi';
import indexDBUtil from '../../indexDB';
import { deriveKeysFromMnemonic, initiateProxyTransfer, validateMnemonic } from '../../utils/migration';
import { generateSignature } from '../../utils';
import { config, getConfigPromise } from '../../../config';
import axios from 'axios';

const MIGRATION_STEPS = {
    PREPARING: 'preparing',
    MNEMONIC_REQUIRED: 'mnemonic_required',
    GENERATING_KEYS: 'generating_keys',
    REQUESTING_DID: 'requesting_did',
    REGISTERING_DID: 'registering_did',
    TRANSFERRING_BALANCE: 'transferring_balance',
    UPDATING_STORAGE: 'updating_storage',
    COMPLETE: 'complete',
    TRANSFER_FAILED: 'transfer_failed',
    FAILED: 'failed'
};

const SingleAccountDIDMigration = ({ username, unifiedPassword, legacyDid: propLegacyDid, legacyPrivateKey: propLegacyPrivateKey, onComplete, onError }) => {
    const [currentStep, setCurrentStep] = useState(MIGRATION_STEPS.PREPARING);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [newDid, setNewDid] = useState(null);
    const [transferContext, setTransferContext] = useState(null);
    const [accountData, setAccountData] = useState(null);

    // Mnemonic input state (when no mnemonic stored)
    const [mnemonicInput, setMnemonicInput] = useState('');
    const [mnemonicError, setMnemonicError] = useState('');
    const [isValidatingMnemonic, setIsValidatingMnemonic] = useState(false);

    useEffect(() => {
        startMigration();
    }, []);

    const startMigration = async () => {
        try {
            setCurrentStep(MIGRATION_STEPS.PREPARING);
            setError(null);
            setProgress(10);

            await getConfigPromise();

            const result = await indexDBUtil.getDecryptedAccountForDIDMigration(username, unifiedPassword);

            if (!result.status) {
                if (result.alreadyMigrated) {
                    await checkAndCompleteFullMigration();
                    onComplete();
                    return;
                }
                throw new Error(result.message || 'Failed to load account');
            }

            setAccountData(result.account);
            await migrateAccount(result.account);
        } catch (err) {
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const migrateAccount = async (account, providedMnemonic = null) => {
        try {
            // Check if mnemonic is available (either from account data or provided by user)
            const mnemonic = providedMnemonic || account.mnemonic;

            if (!mnemonic) {
                // No mnemonic available - prompt user to enter recovery phrase
                setCurrentStep(MIGRATION_STEPS.MNEMONIC_REQUIRED);
                setProgress(15);
                return;
            }

            setCurrentStep(MIGRATION_STEPS.GENERATING_KEYS);
            setProgress(20);

            let newPublicKey;
            let privateKeyHex;
            let legacyPrivateKeyHex;

            const effectiveLegacyDid = propLegacyDid || account.legacyDid;
            const effectiveLegacyPrivateKey = propLegacyPrivateKey;

            const keys = deriveKeysFromMnemonic(mnemonic);
            newPublicKey = keys.uncompressedPublicKey;
            privateKeyHex = keys.privateKey;
            legacyPrivateKeyHex = effectiveLegacyPrivateKey || keys.legacyPrivateKey;

            if (!privateKeyHex || typeof privateKeyHex !== 'string') {
                throw new Error('invalid private key, expected hex or 32 bytes, got ' + typeof privateKeyHex);
            }

            privateKeyHex = privateKeyHex.trim().toLowerCase().replace(/^0x/, '');

            if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
                throw new Error(`invalid private key format: expected 64 hex characters, got ${privateKeyHex.length} characters`);
            }

            if (legacyPrivateKeyHex) {
                legacyPrivateKeyHex = legacyPrivateKeyHex.trim().toLowerCase().replace(/^0x/, '');
            }

            let generatedNewDid;

            if (effectiveLegacyDid) {
                generatedNewDid = account.did;
                setNewDid(generatedNewDid);
                setProgress(70);
            } else {
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

                setCurrentStep(MIGRATION_STEPS.REGISTERING_DID);
                setProgress(50);

                const registrationPromises = networks.map(async (network) => {
                    try {
                        const customApi = axios.create({
                            baseURL: network.baseUrl,
                            headers: { 'Content-Type': 'application/json' }
                        });

                        let didResponse = await customApi.post('/request-did-for-pubkey', {
                            public_key: newPublicKey,
                            network: network.id
                        });
                        didResponse = didResponse.data;

                        if (!didResponse || !didResponse.did) {
                            return null;
                        }

                        const newDid = didResponse.did;

                        let registerResponse = await customApi.post('/register-did', { did: newDid });
                        registerResponse = registerResponse.data;

                        if (!registerResponse || !registerResponse.status) {
                            return null;
                        }

                        const signature = await generateSignature(privateKeyHex, registerResponse.result.hash);
                        let signatureResponse = await customApi.post('/signature-response', {
                            id: registerResponse.result.id,
                            Signature: { Signature: signature },
                            mode: 4
                        });
                        signatureResponse = signatureResponse.data;

                        if (!signatureResponse || !signatureResponse.status) {
                            return null;
                        }

                        return {
                            network: network.id,
                            did: newDid,
                            status: true,
                            baseUrl: network.baseUrl
                        };
                    } catch (error) {
                        return null;
                    }
                });

                const registrationResults = await Promise.all(registrationPromises);
                const successfulRegistrations = registrationResults.filter(result => result !== null);

                if (successfulRegistrations.length === 0) {
                    throw new Error('Failed to register new DID on any network');
                }

                generatedNewDid = successfulRegistrations[0].did;
                setNewDid(generatedNewDid);
                setProgress(70);
            }

            const oldDid = effectiveLegacyDid || account.did;

            const rubixNetworks = [
                { id: '1', baseUrl: config.RUBIX_MAINNET_BASE_URL }
            ];

            for (const network of rubixNetworks) {
                if (!network.baseUrl) continue;

                try {
                    setCurrentStep(MIGRATION_STEPS.TRANSFERRING_BALANCE);
                    setProgress(75);

                    const transferCtx = {
                        privateKeyHex: legacyPrivateKeyHex,
                        oldDid: oldDid,
                        newDid: generatedNewDid,
                        networkBaseUrl: network.baseUrl,
                        account,
                        newPublicKey,
                        newPrivateKey: privateKeyHex
                    };
                    setTransferContext(transferCtx);

                    const transferResult = await initiateProxyTransfer(legacyPrivateKeyHex, oldDid, generatedNewDid, network.baseUrl);

                    if (!transferResult.success) {
                        setError(transferResult.message || 'Transfer failed. Please retry.');
                        setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
                        return;
                    }
                } catch (e) {
                }
            }

            if (!effectiveLegacyDid) {
                setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
                setProgress(85);

                await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                    newDid: generatedNewDid,
                    newPublicKey: newPublicKey,
                    newPrivateKey: privateKeyHex,
                    unifiedPassword: unifiedPassword
                });
            } else {
                setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
                setProgress(85);
            }

            setProgress(90);

            await indexDBUtil.markAccountAsMigrated(account.username);

            setProgress(95);

            await checkAndCompleteFullMigration();

            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            setProgress(100);

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
                await indexDBUtil.completeDIDMigration();
            }
        } catch (err) {
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setError(null);
        await startMigration();
        setIsRetrying(false);
    };

    const handleRetryTransfer = async () => {
        if (!transferContext) return;

        setIsRetrying(true);
        setError(null);
        setCurrentStep(MIGRATION_STEPS.TRANSFERRING_BALANCE);

        try {
            const { privateKeyHex, oldDid, newDid: receiverDid, networkBaseUrl, account, newPublicKey, newPrivateKey } = transferContext;

            const transferResult = await initiateProxyTransfer(privateKeyHex, oldDid, receiverDid, networkBaseUrl);

            if (!transferResult.success) {
                setError(transferResult.message || 'Transfer failed. Please retry.');
                setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
                setIsRetrying(false);
                return;
            }

            setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
            setProgress(85);

            await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                newDid: receiverDid,
                newPublicKey: newPublicKey,
                newPrivateKey: newPrivateKey || privateKeyHex,
                unifiedPassword: unifiedPassword
            });

            setProgress(90);

            await indexDBUtil.markAccountAsMigrated(account.username);

            setProgress(95);

            await checkAndCompleteFullMigration();

            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            setProgress(100);

            setTimeout(() => {
                onComplete();
            }, 1000);

        } catch (err) {
            setError(`Transfer failed: ${err.message}`);
            setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
        }

        setIsRetrying(false);
    };

    // Handle mnemonic paste from clipboard
    const handleMnemonicPaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setMnemonicInput(text.trim());
            setMnemonicError('');
        } catch (err) {
            setMnemonicError('Failed to paste from clipboard');
        }
    };

    // Get word count from mnemonic input
    const getMnemonicWordCount = () => {
        if (!mnemonicInput.trim()) return 0;
        return mnemonicInput.trim().split(/\s+/).length;
    };

    // Handle mnemonic submission
    const handleMnemonicSubmit = async () => {
        setMnemonicError('');
        setIsValidatingMnemonic(true);

        try {
            // Validate mnemonic format
            if (!validateMnemonic(mnemonicInput.trim())) {
                setMnemonicError('Invalid recovery phrase');
                setIsValidatingMnemonic(false);
                return;
            }

            // Derive keys from provided mnemonic
            const keys = deriveKeysFromMnemonic(mnemonicInput.trim());

            // Verify the mnemonic matches this account by comparing public keys
            const accountPublicKey = accountData.publickey;
            const matchesAccount =
                accountPublicKey === keys.compressedPublicKey ||
                accountPublicKey === keys.uncompressedPublicKey ||
                accountPublicKey === keys.legacyCompressedPublicKey ||
                accountPublicKey === keys.legacyUncompressedPublicKey;

            if (!matchesAccount) {
                setMnemonicError('Recovery phrase does not match this account');
                setIsValidatingMnemonic(false);
                return;
            }

            // Mnemonic validated - continue migration with the provided mnemonic
            setIsValidatingMnemonic(false);
            await migrateAccount(accountData, mnemonicInput.trim());
        } catch (err) {
            setMnemonicError(err.message || 'Invalid recovery phrase');
            setIsValidatingMnemonic(false);
        }
    };

    const getStepLabel = () => {
        switch (currentStep) {
            case MIGRATION_STEPS.PREPARING:
                return 'Preparing upgrade...';
            case MIGRATION_STEPS.MNEMONIC_REQUIRED:
                return 'Recovery phrase required';
            case MIGRATION_STEPS.GENERATING_KEYS:
                return 'Upgrading keys...';
            case MIGRATION_STEPS.REQUESTING_DID:
                return 'Upgrading DID...';
            case MIGRATION_STEPS.REGISTERING_DID:
                return 'Registering DID on network...';
            case MIGRATION_STEPS.TRANSFERRING_BALANCE:
                return 'Updating...';
            case MIGRATION_STEPS.UPDATING_STORAGE:
                return 'Updating local storage...';
            case MIGRATION_STEPS.COMPLETE:
                return 'Upgrade complete!';
            case MIGRATION_STEPS.TRANSFER_FAILED:
                return 'Upgrade failed';
            case MIGRATION_STEPS.FAILED:
                return 'Upgrade failed';
            default:
                return 'Processing...';
        }
    };

    // Mnemonic required state - prompt user to enter recovery phrase
    if (currentStep === MIGRATION_STEPS.MNEMONIC_REQUIRED) {
        const wordCount = getMnemonicWordCount();
        const isValidLength = wordCount === 24;

        return (
            <div className="flex flex-col h-full pt-4 pb-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-amber-100">
                        <FiAlertCircle className="text-amber-600" size={24} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-xl text-senary">Recovery Phrase Required</h2>
                        <p className="text-quinary text-sm">Enter your recovery phrase to continue</p>
                    </div>
                </div>

                {/* Account Info Card */}
                <div className="mb-4 p-4 bg-tertiary/50 rounded-lg border border-secondary/20">
                    <p className="text-sm text-quinary mb-1">Account</p>
                    <p className="font-medium text-senary">@{username}</p>
                </div>

                {/* Info Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start space-x-2">
                        <FiAlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                            Your recovery phrase is needed to upgrade your wallet keys.
                            Make sure no one is watching your screen.
                        </p>
                    </div>
                </div>

                {/* Textarea */}
                <div className="mb-4 flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-senary">
                            Recovery Phrase
                        </label>
                        <button
                            onClick={handleMnemonicPaste}
                            className="flex items-center space-x-1 text-xs text-primary hover:text-secondary"
                        >
                            <FiClipboard className="w-3 h-3" />
                            <span>Paste</span>
                        </button>
                    </div>
                    <textarea
                        value={mnemonicInput}
                        onChange={(e) => {
                            setMnemonicInput(e.target.value);
                            setMnemonicError('');
                        }}
                        placeholder="Enter your 24 word recovery phrase..."
                        className={`
                            w-full h-32 p-3 text-sm rounded-lg resize-none
                            border-2 focus:outline-none focus:ring-2
                            ${mnemonicError
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-gray-200 focus:border-primary focus:ring-primary'
                            }
                            bg-surface-low text-senary
                            placeholder-quinary
                        `}
                    />

                    {/* Word Count and Error */}
                    <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs ${isValidLength ? 'text-green-500' : 'text-quinary'}`}>
                            {wordCount} / 24 words
                        </span>
                        {mnemonicError && (
                            <span className="text-xs text-red-500">{mnemonicError}</span>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleMnemonicSubmit}
                    disabled={!isValidLength || isValidatingMnemonic}
                    className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                        isValidLength && !isValidatingMnemonic
                            ? 'bg-secondary hover:bg-primary'
                            : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                    {isValidatingMnemonic ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            Validating...
                        </span>
                    ) : (
                        'Continue Upgrade'
                    )}
                </button>
            </div>
        );
    }

    if (currentStep === MIGRATION_STEPS.TRANSFER_FAILED) {
        return (
            <div className="flex flex-col h-full pt-4 pb-6">
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="p-4 rounded-full bg-tertiary mb-4">
                        <FiRefreshCw className="text-primary" size={32} />
                    </div>
                    <h2 className="font-semibold text-xl text-senary mb-2">Consensus Failed</h2>
                    <p className="text-quinary text-sm text-center mb-4">@{username}</p>
                    <p className="text-quinary text-sm text-center mb-6">
                        Please retry to complete your upgrade.
                    </p>
                </div>
                <button
                    onClick={handleRetryTransfer}
                    disabled={isRetrying}
                    className="w-full bg-secondary hover:bg-primary text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:text-gray-500"
                >
                    {isRetrying ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            Updating...
                        </span>
                    ) : (
                        'Retry'
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full pt-4 pb-6">
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
                    <h2 className="font-semibold text-xl text-senary">Wallet Upgradation</h2>
                    <p className="text-quinary text-sm">{getStepLabel()}</p>
                </div>
            </div>

            <div className="mb-6 p-4 bg-tertiary/50 rounded-lg border border-secondary/20">
                <p className="text-sm text-quinary mb-1">Updating account</p>
                <p className="font-medium text-senary">@{username}</p>
            </div>

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

            <div className="flex-1 space-y-2 mb-4">
                {[
                    { step: MIGRATION_STEPS.PREPARING, label: 'Prepare account data' },
                    { step: MIGRATION_STEPS.GENERATING_KEYS, label: 'Upgrading keys' },
                    { step: MIGRATION_STEPS.REQUESTING_DID, label: 'Upgrade DID' },
                    { step: MIGRATION_STEPS.REGISTERING_DID, label: 'Register on network' },
                    { step: MIGRATION_STEPS.UPDATING_STORAGE, label: 'Update local storage' }
                ].map(({ step, label }, index) => {
                    const stepIndex = Object.values(MIGRATION_STEPS).indexOf(step);
                    const currentIndex = Object.values(MIGRATION_STEPS).indexOf(currentStep);
                    const isComplete = currentIndex > stepIndex || currentStep === MIGRATION_STEPS.COMPLETE;
                    const isCurrent = step === currentStep;

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

            {currentStep === MIGRATION_STEPS.COMPLETE && newDid && (
                <div className="bg-tertiary border border-secondary/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-quinary mb-1">New DID</p>
                    <p className="text-sm text-secondary font-mono truncate">{newDid}</p>
                </div>
            )}

            {error && currentStep === MIGRATION_STEPS.FAILED && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

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
                        'Retry Upgrade'
                    )}
                </button>
            )}

            {currentStep === MIGRATION_STEPS.COMPLETE && (
                <div className="text-center">
                    <p className="text-secondary font-medium">Account upgraded successfully!</p>
                    <p className="text-sm text-quinary mt-1">Continuing to wallet...</p>
                </div>
            )}
        </div>
    );
};

export default SingleAccountDIDMigration;
