import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import indexDBUtil from '../../indexDB';
import { generateUncompressedPublicKey, deriveKeysFromMnemonic, initiateProxyTransfer } from '../../utils/migration';
import { getConfigPromise } from '../../../config';
import { getMigrationNetworks } from '../../utils/networkConfig';
import { registerDIDOnAllNetworks, registerExistingDIDOnAllNetworks } from '../../utils/didRegistration';

const MIGRATION_STEPS = {
    PREPARING: 'preparing',
    GENERATING_KEYS: 'generating_keys',
    REGISTERING_OLD_DID: 'registering_old_did',
    REQUESTING_DID: 'requesting_did',
    REGISTERING_DID: 'registering_did',
    UPDATING_STORAGE: 'updating_storage',
    COMPLETE: 'complete',
    FAILED: 'failed'
};

const DIDMigrationProgress = ({ unifiedPassword, onComplete, onError }) => {
    const [accounts, setAccounts] = useState([]);
    const [currentAccountIndex, setCurrentAccountIndex] = useState(0);
    const [currentStep, setCurrentStep] = useState(MIGRATION_STEPS.PREPARING);
    const [overallProgress, setOverallProgress] = useState(0);
    const [error, setError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        startMigration();
    }, []);

    const startMigration = async () => {
        try {
            setCurrentStep(MIGRATION_STEPS.PREPARING);
            setError(null);

            await getConfigPromise();

            const result = await indexDBUtil.getAllDecryptedAccountsForDIDMigration(unifiedPassword);

            if (!result.status) {
                throw new Error(result.message || 'Failed to load accounts');
            }

            if (result.accounts.length === 0) {
                await indexDBUtil.completeDIDMigration();
                onComplete();
                return;
            }

            setAccounts(result.accounts.map(acc => ({
                ...acc,
                migrationStatus: 'pending',
                newDid: null,
                newPublicKey: null
            })));

            await migrateAccount(0, result.accounts);
        } catch (err) {
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const migrateAccount = async (index, accountsList) => {
        const accountsToUse = accountsList || accounts;

        if (index >= accountsToUse.length) {
            await completeMigration();
            return;
        }

        const account = accountsToUse[index];
        setCurrentAccountIndex(index);

        try {
            setCurrentStep(MIGRATION_STEPS.GENERATING_KEYS);
            updateAccountStatus(index, 'migrating');

            let newPublicKey;
            let privateKeyHex;

            if (account.mnemonic) {
                const keys = deriveKeysFromMnemonic(account.mnemonic);

                const currentPubKey = account.publickey;
                const matchesNew = currentPubKey === keys.compressedPublicKey;
                const matchesLegacy = currentPubKey === keys.legacyCompressedPublicKey;

                if (matchesLegacy && !matchesNew) {
                    newPublicKey = keys.legacyUncompressedPublicKey;
                    privateKeyHex = keys.legacyPrivateKey;
                } else {
                    newPublicKey = keys.uncompressedPublicKey;
                    privateKeyHex = keys.privateKey;
                }
            } else {
                newPublicKey = generateUncompressedPublicKey(account.privateKey);
                privateKeyHex = account.privateKey;
            }

            if (!privateKeyHex || typeof privateKeyHex !== 'string') {
                throw new Error('invalid private key, expected hex or 32 bytes, got ' + typeof privateKeyHex);
            }

            privateKeyHex = privateKeyHex.trim().toLowerCase().replace(/^0x/, '');

            if (!/^[0-9a-f]{64}$/i.test(privateKeyHex)) {
                throw new Error(`invalid private key format: expected 64 hex characters, got ${privateKeyHex.length} characters`);
            }

            setCurrentStep(MIGRATION_STEPS.REGISTERING_OLD_DID);

            const oldDid = account.did;
            let oldPrivateKey = privateKeyHex;

            if (account.mnemonic) {
                const keys = deriveKeysFromMnemonic(account.mnemonic);
                const currentPubKey = account.publickey;
                const matchesLegacy = currentPubKey === keys.legacyCompressedPublicKey;

                if (matchesLegacy) {
                    oldPrivateKey = keys.legacyPrivateKey;
                }
            }

            try {
                await registerExistingDIDOnAllNetworks(oldDid, oldPrivateKey);
            } catch (regError) {
            }

            setCurrentStep(MIGRATION_STEPS.REQUESTING_DID);

            setCurrentStep(MIGRATION_STEPS.REGISTERING_DID);

            const registrationResult = await registerDIDOnAllNetworks(newPublicKey, privateKeyHex, unifiedPassword);
            const newDid = registrationResult.primaryDid;

            const rubixNetworks = getMigrationNetworks();

            for (const network of rubixNetworks) {
                if (!network.baseUrl) continue;

                try {
                    await initiateProxyTransfer(privateKeyHex, account.did, newDid, network.baseUrl);
                } catch (transferError) {
                }
            }

            setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);

            await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                newDid: newDid,
                newPublicKey: newPublicKey,
                newPrivateKey: privateKeyHex,
                unifiedPassword: unifiedPassword
            });

            await indexDBUtil.markAccountAsMigrated(account.username);

            updateAccountStatus(index, 'completed', { newDid, newPublicKey });

            const progress = ((index + 1) / accountsToUse.length) * 100;
            setOverallProgress(progress);

            await migrateAccount(index + 1, accountsToUse);

        } catch (err) {
            updateAccountStatus(index, 'failed');
            setError(`Failed to migrate ${account.username}: ${err.message}`);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const completeMigration = async () => {
        try {
            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            await indexDBUtil.completeDIDMigration();
            setOverallProgress(100);

            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (err) {
            setError('Failed to complete migration');
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const updateAccountStatus = (index, status, data = {}) => {
        setAccounts(prev => prev.map((acc, i) =>
            i === index
                ? { ...acc, migrationStatus: status, ...data }
                : acc
        ));
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
            case MIGRATION_STEPS.REGISTERING_OLD_DID:
                return 'Registering old DID on networks...';
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
                    <h2 className="font-semibold text-xl text-senary">DID Migration</h2>
                    <p className="text-quinary text-sm">{getStepLabel()}</p>
                </div>
            </div>

            {/* Overall Progress */}
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-quinary">Overall Progress</span>
                    <span className="font-medium text-senary">{Math.round(overallProgress)}%</span>
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
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4" style={{ maxHeight: '250px' }}>
                {accounts.map((account, index) => (
                    <div
                        key={account.username}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                            account.migrationStatus === 'completed'
                                ? 'bg-tertiary border-secondary/30'
                                : account.migrationStatus === 'failed'
                                    ? 'bg-red-50 border-red-200'
                                    : account.migrationStatus === 'migrating'
                                        ? 'bg-tertiary/50 border-secondary/20'
                                        : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                        {/* Status icon */}
                        <div className={`p-1.5 rounded-full ${
                            account.migrationStatus === 'completed'
                                ? 'bg-secondary/10'
                                : account.migrationStatus === 'failed'
                                    ? 'bg-red-100'
                                    : account.migrationStatus === 'migrating'
                                        ? 'bg-primary/10'
                                        : 'bg-gray-100'
                        }`}>
                            {account.migrationStatus === 'completed' ? (
                                <FiCheck className="text-secondary" size={14} />
                            ) : account.migrationStatus === 'failed' ? (
                                <FiX className="text-red-600" size={14} />
                            ) : account.migrationStatus === 'migrating' ? (
                                <FiLoader className="text-primary animate-spin" size={14} />
                            ) : (
                                <div className="w-3.5 h-3.5 rounded-full bg-gray-300" />
                            )}
                        </div>

                        {/* Account info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-senary truncate">{account.username}</p>
                            {account.migrationStatus === 'completed' && account.newDid && (
                                <p className="text-xs text-secondary truncate">
                                    New: {account.newDid.slice(0, 5)}....{account.newDid.slice(-5)}
                                </p>
                            )}
                            {account.migrationStatus === 'migrating' && (
                                <p className="text-xs text-primary">
                                    {getStepLabel()}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

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
                    <p className="text-secondary font-medium">All accounts migrated successfully!</p>
                    <p className="text-sm text-quinary mt-1">Redirecting to dashboard...</p>
                </div>
            )}
        </div>
    );
};

export default DIDMigrationProgress;
