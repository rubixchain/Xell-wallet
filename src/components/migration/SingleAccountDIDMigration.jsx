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
    const [remainingBalance, setRemainingBalance] = useState(0);

    useEffect(() => {
        startMigration();
    }, []);

    const startMigration = async () => {
        console.log('[Migration] ========== STARTING MIGRATION ==========');
        console.log('[Migration] Username:', username);
        console.log('[Migration] Props - legacyDid:', propLegacyDid);
        console.log('[Migration] Props - legacyPrivateKey provided:', !!propLegacyPrivateKey);

        try {
            setCurrentStep(MIGRATION_STEPS.PREPARING);
            setError(null);
            setProgress(10);

            console.log('[Migration] Getting decrypted account from IndexDB...');
            const result = await indexDBUtil.getDecryptedAccountForDIDMigration(username, unifiedPassword);
            console.log('[Migration] IndexDB result:', { status: result.status, alreadyMigrated: result.alreadyMigrated, hasAccount: !!result.account });

            if (!result.status) {
                if (result.alreadyMigrated) {
                    console.log('[Migration] Account already migrated, completing...');
                    await checkAndCompleteFullMigration();
                    onComplete();
                    return;
                }
                throw new Error(result.message || 'Failed to load account');
            }

            console.log('[Migration] Account loaded:', {
                username: result.account.username,
                did: result.account.did,
                network: result.account.network,
                hasMnemonic: !!result.account.mnemonic,
                hasPrivateKey: !!result.account.privateKey,
                legacyDid: result.account.legacyDid
            });

            await migrateAccount(result.account);
        } catch (err) {
            console.error('[Migration] FATAL ERROR:', err);
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const migrateAccount = async (account) => {
        try {
            setCurrentStep(MIGRATION_STEPS.GENERATING_KEYS);
            setProgress(20);

            let newPublicKey;
            let privateKeyHex;
            let legacyPrivateKeyHex;

            // Use prop values if provided (fresh import case), otherwise derive from mnemonic
            const effectiveLegacyDid = propLegacyDid || account.legacyDid;
            const effectiveLegacyPrivateKey = propLegacyPrivateKey;

            if (account.mnemonic) {
                const keys = deriveKeysFromMnemonic(account.mnemonic);
                newPublicKey = keys.uncompressedPublicKey;
                privateKeyHex = keys.privateKey;
                legacyPrivateKeyHex = effectiveLegacyPrivateKey || keys.legacyPrivateKey;
            } else {
                newPublicKey = generateUncompressedPublicKey(account.privateKey);
                privateKeyHex = account.privateKey;
                legacyPrivateKeyHex = effectiveLegacyPrivateKey || account.privateKey;
            }

            // Validate private key format
            if (!privateKeyHex || typeof privateKeyHex !== 'string') {
                throw new Error('invalid private key, expected hex or 32 bytes, got ' + typeof privateKeyHex);
            }

            // Ensure privateKeyHex is a clean hex string without spaces or '0x' prefix
            privateKeyHex = privateKeyHex.trim().toLowerCase().replace(/^0x/, '');

            if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
                throw new Error(`invalid private key format: expected 64 hex characters, got ${privateKeyHex.length} characters`);
            }

            // Also validate legacy private key if we have one
            if (legacyPrivateKeyHex) {
                legacyPrivateKeyHex = legacyPrivateKeyHex.trim().toLowerCase().replace(/^0x/, '');
            }

            let generatedNewDid;

            // Check if this is a fresh import (legacyDid exists, meaning account.did is already the new DID)
            if (effectiveLegacyDid) {
                // Fresh import case: account.did is already the new DID, legacyDid is the old one
                generatedNewDid = account.did;
                setNewDid(generatedNewDid);
                setProgress(70);
            } else {
                // Normal migration case: need to create new DID
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

            // Determine the old DID for balance transfer
            const oldDid = effectiveLegacyDid || account.did;

            const rubixMainnet = ['1'];
            const networkStr = String(account.network);

            if (rubixMainnet.includes(networkStr)) {
                const currentNetworkBaseUrl = getBaseUrlForNetwork(account.network);
                console.log('[Migration] Network check:', { networkStr, currentNetworkBaseUrl, oldDid, newDid: generatedNewDid });

                const currentNetworkApi = axios.create({
                    baseURL: currentNetworkBaseUrl,
                    headers: { 'Content-Type': 'application/json' }
                });

                console.log('[Migration] Fetching old DID balance...', { oldDid });
                const accountInfo = await currentNetworkApi.get('/get-account-info', { params: { did: oldDid } });
                console.log('[Migration] Old DID account info response:', JSON.stringify(accountInfo?.data, null, 2));
                const balance = accountInfo?.data?.account_info?.[0]?.rbt_amount || 0;
                console.log('[Migration] Old DID balance:', balance);

                if (balance > 0) {
                    console.log('[Migration] Balance > 0, initiating transfer...', { balance, from: oldDid, to: generatedNewDid });
                    setCurrentStep(MIGRATION_STEPS.TRANSFERRING_BALANCE);
                    setProgress(75);
                    setRemainingBalance(balance);

                    const transferCtx = {
                        privateKeyHex: legacyPrivateKeyHex,
                        oldDid: oldDid,
                        newDid: generatedNewDid,
                        networkBaseUrl: currentNetworkBaseUrl,
                        account,
                        newPublicKey,
                        newPrivateKey: privateKeyHex
                    };
                    console.log('[Migration] Transfer context saved:', { oldDid, newDid: generatedNewDid, networkBaseUrl: currentNetworkBaseUrl });
                    setTransferContext(transferCtx);

                    console.log('[Migration] Calling initiateProxyTransfer...');
                    const transferResult = await initiateProxyTransfer(legacyPrivateKeyHex, oldDid, generatedNewDid);
                    console.log('[Migration] Transfer result:', JSON.stringify(transferResult, null, 2));

                    if (!transferResult.success) {
                        console.error('[Migration] Transfer FAILED:', transferResult.message || 'Unknown error');
                        setError(transferResult.message || 'Transfer failed. Please retry.');
                        setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
                        return;
                    }

                    console.log('[Migration] Transfer reported success, verifying old DID balance...');
                    const verifyInfo = await currentNetworkApi.get('/get-account-info', { params: { did: oldDid } });
                    console.log('[Migration] Old DID verify response:', JSON.stringify(verifyInfo?.data, null, 2));
                    const balanceAfterTransfer = verifyInfo?.data?.account_info?.[0]?.rbt_amount || 0;
                    console.log('[Migration] Old DID balance after transfer:', balanceAfterTransfer);
                    setRemainingBalance(balanceAfterTransfer);

                    if (balanceAfterTransfer > 0) {
                        console.error('[Migration] Transfer INCOMPLETE - remaining balance:', balanceAfterTransfer);
                        setError(`Transfer incomplete. ${balanceAfterTransfer} RBT remaining. Please retry.`);
                        setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
                        return;
                    }

                    console.log('[Migration] Verifying new DID balance...');
                    const newDidInfo = await currentNetworkApi.get('/get-account-info', { params: { did: generatedNewDid } });
                    console.log('[Migration] New DID account info:', JSON.stringify(newDidInfo?.data, null, 2));
                    const newDidBalance = newDidInfo?.data?.account_info?.[0]?.rbt_amount || 0;
                    console.log('[Migration] New DID balance:', newDidBalance);

                    if (newDidBalance === 0 && balance > 0) {
                        console.warn('[Migration] WARNING: New DID balance is 0 but old DID had', balance, 'RBT');
                    }
                } else {
                    console.log('[Migration] No balance to transfer (balance = 0)');
                }
            } else {
                console.log('[Migration] Skipping transfer - network not in rubixMainnet:', { networkStr, rubixMainnet });
            }

            // Step 5: Update local storage (only for normal migration, fresh imports already have correct DID)
            console.log('[Migration] Step 5: Updating local storage...');
            console.log('[Migration] effectiveLegacyDid:', effectiveLegacyDid);

            if (!effectiveLegacyDid) {
                setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
                setProgress(85);

                console.log('[Migration] Updating account with new DID in IndexDB...', {
                    username: account.username,
                    newDid: generatedNewDid,
                    newPublicKeyLength: newPublicKey?.length,
                    newPrivateKeyLength: privateKeyHex?.length
                });

                await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                    newDid: generatedNewDid,
                    newPublicKey: newPublicKey,
                    newPrivateKey: privateKeyHex,
                    unifiedPassword: unifiedPassword
                });
                console.log('[Migration] IndexDB updated with new DID');
            } else {
                console.log('[Migration] Fresh import case - skipping DID update (already has correct DID)');
                setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
                setProgress(85);
            }

            setProgress(90);

            // Step 6: Mark account as fully migrated (only after ALL steps succeed)
            console.log('[Migration] Step 6: Marking account as migrated...');
            await indexDBUtil.markAccountAsMigrated(account.username);
            console.log('[Migration] Account marked as migrated');

            setProgress(95);

            // Check if all accounts are now migrated
            console.log('[Migration] Checking if all accounts are migrated...');
            await checkAndCompleteFullMigration();

            // Complete
            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            setProgress(100);
            console.log('[Migration] ========== MIGRATION COMPLETE ==========');
            console.log('[Migration] Final state:', { newDid: generatedNewDid, username: account.username });

            // Notify parent after a short delay
            setTimeout(() => {
                console.log('[Migration] Calling onComplete callback...');
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
            // Failed to check/complete full migration
        }
    };

    const getBaseUrlForNetwork = (network) => {
        const networkId = parseInt(network);
        switch (networkId) {
            case 1:
                return 'http://localhost:3000';
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

    const handleRetryTransfer = async () => {
        console.log('[Migration Retry] Starting retry transfer...');
        if (!transferContext) {
            console.error('[Migration Retry] No transfer context available!');
            return;
        }

        setIsRetrying(true);
        setError(null);
        setCurrentStep(MIGRATION_STEPS.TRANSFERRING_BALANCE);

        try {
            const { privateKeyHex, oldDid, newDid: receiverDid, networkBaseUrl, account, newPublicKey, newPrivateKey } = transferContext;
            console.log('[Migration Retry] Transfer context:', { oldDid, receiverDid, networkBaseUrl });

            const currentNetworkApi = axios.create({
                baseURL: networkBaseUrl,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('[Migration Retry] Checking old DID balance before retry...');
            const preRetryInfo = await currentNetworkApi.get('/get-account-info', { params: { did: oldDid } });
            console.log('[Migration Retry] Old DID balance before retry:', JSON.stringify(preRetryInfo?.data, null, 2));
            const preRetryBalance = preRetryInfo?.data?.account_info?.[0]?.rbt_amount || 0;
            console.log('[Migration Retry] Pre-retry balance:', preRetryBalance);

            if (preRetryBalance === 0) {
                console.log('[Migration Retry] Old DID already has 0 balance, skipping transfer...');
            } else {
                console.log('[Migration Retry] Calling initiateProxyTransfer...');
                const transferResult = await initiateProxyTransfer(privateKeyHex, oldDid, receiverDid);
                console.log('[Migration Retry] Transfer result:', JSON.stringify(transferResult, null, 2));

                if (!transferResult.success) {
                    console.error('[Migration Retry] Transfer FAILED:', transferResult.message || 'Unknown error');
                    setError(transferResult.message || 'Transfer failed. Please retry.');
                    setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
                    setIsRetrying(false);
                    return;
                }
            }

            console.log('[Migration Retry] Verifying old DID balance after transfer...');
            const verifyInfo = await currentNetworkApi.get('/get-account-info', { params: { did: oldDid } });
            console.log('[Migration Retry] Old DID verify response:', JSON.stringify(verifyInfo?.data, null, 2));
            const balanceAfterTransfer = verifyInfo?.data?.account_info?.[0]?.rbt_amount || 0;
            console.log('[Migration Retry] Old DID balance after transfer:', balanceAfterTransfer);
            setRemainingBalance(balanceAfterTransfer);

            if (balanceAfterTransfer > 0) {
                console.error('[Migration Retry] Transfer INCOMPLETE - remaining balance:', balanceAfterTransfer);
                setError(`Transfer incomplete. ${balanceAfterTransfer} RBT remaining. Please retry.`);
                setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
                setIsRetrying(false);
                return;
            }

            console.log('[Migration Retry] Verifying new DID balance...');
            const newDidInfo = await currentNetworkApi.get('/get-account-info', { params: { did: receiverDid } });
            console.log('[Migration Retry] New DID account info:', JSON.stringify(newDidInfo?.data, null, 2));
            const newDidBalance = newDidInfo?.data?.account_info?.[0]?.rbt_amount || 0;
            console.log('[Migration Retry] New DID balance:', newDidBalance);

            setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);
            setProgress(85);

            console.log('[Migration Retry] Updating storage with new DID...');
            await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                newDid: receiverDid,
                newPublicKey: newPublicKey,
                newPrivateKey: newPrivateKey || privateKeyHex,
                unifiedPassword: unifiedPassword
            });
            console.log('[Migration Retry] Storage updated successfully');

            setProgress(90);

            console.log('[Migration Retry] Marking account as migrated...');
            await indexDBUtil.markAccountAsMigrated(account.username);
            console.log('[Migration Retry] Account marked as migrated');

            setProgress(95);

            await checkAndCompleteFullMigration();

            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            setProgress(100);
            console.log('[Migration Retry] Migration complete!');

            setTimeout(() => {
                onComplete();
            }, 1000);

        } catch (err) {
            console.error('[Migration Retry] Exception during retry:', err);
            setError(`Transfer failed: ${err.message}`);
            setCurrentStep(MIGRATION_STEPS.TRANSFER_FAILED);
        }

        setIsRetrying(false);
    };

    const getStepLabel = () => {
        switch (currentStep) {
            case MIGRATION_STEPS.PREPARING:
                return 'Preparing upgrade...';
            case MIGRATION_STEPS.GENERATING_KEYS:
                return 'Upgrading keys...';
            case MIGRATION_STEPS.REQUESTING_DID:
                return 'Upgrading DID...';
            case MIGRATION_STEPS.REGISTERING_DID:
                return 'Registering DID on network...';
            case MIGRATION_STEPS.TRANSFERRING_BALANCE:
                return 'Transferring balance...';
            case MIGRATION_STEPS.UPDATING_STORAGE:
                return 'Updating local storage...';
            case MIGRATION_STEPS.COMPLETE:
                return 'Upgrade complete!';
            case MIGRATION_STEPS.TRANSFER_FAILED:
                return 'Balance transfer failed';
            case MIGRATION_STEPS.FAILED:
                return 'Upgrade failed';
            default:
                return 'Processing...';
        }
    };

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
                        Please retry to complete your balance transfer.
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
                            Transferring...
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
                    <h2 className="font-semibold text-xl text-senary">Wallet Upgradation</h2>
                    <p className="text-quinary text-sm">{getStepLabel()}</p>
                </div>
            </div>

            {/* Account being upgraded */}
            <div className="mb-6 p-4 bg-tertiary/50 rounded-lg border border-secondary/20">
                <p className="text-sm text-quinary mb-1">Updating account</p>
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

            {/* Upgrade Steps */}
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

            {/* New DID display on success */}
            {currentStep === MIGRATION_STEPS.COMPLETE && newDid && (
                <div className="bg-tertiary border border-secondary/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-quinary mb-1">New DID</p>
                    <p className="text-sm text-secondary font-mono truncate">{newDid}</p>
                </div>
            )}

            {/* Error message */}
            {error && currentStep === MIGRATION_STEPS.FAILED && (
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
                        'Retry Upgrade'
                    )}
                </button>
            )}

            {/* Success message */}
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
