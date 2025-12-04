import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import indexDBUtil from '../../indexDB';
import { generateUncompressedPublicKey, deriveKeysFromMnemonic } from '../../utils/migration';
import { END_POINTS } from '../../api/endpoints';
import { generateSignature } from '../../utils';
import { config } from '../../../config';
import axios from 'axios';
import toast from 'react-hot-toast';

const MIGRATION_STEPS = {
    PREPARING: 'preparing',
    GENERATING_KEYS: 'generating_keys',
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

            // Get all accounts that need DID migration
            const result = await indexDBUtil.getAllDecryptedAccountsForDIDMigration(unifiedPassword);

            if (!result.status) {
                throw new Error(result.message || 'Failed to load accounts');
            }

            if (result.accounts.length === 0) {
                // No accounts to migrate, complete immediately
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

            // Start migrating first account
            await migrateAccount(0, result.accounts);
        } catch (err) {
            setError(err.message);
            setCurrentStep(MIGRATION_STEPS.FAILED);
        }
    };

    const migrateAccount = async (index, accountsList) => {
        const accountsToUse = accountsList || accounts;

        if (index >= accountsToUse.length) {
            // All accounts migrated successfully
            await completeMigration();
            return;
        }

        const account = accountsToUse[index];
        setCurrentAccountIndex(index);

        try {
            // Step 1: Generate new keys
            setCurrentStep(MIGRATION_STEPS.GENERATING_KEYS);
            updateAccountStatus(index, 'migrating');

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

            const newDid = didResponse.did;

            // Step 3: Register the new DID
            setCurrentStep(MIGRATION_STEPS.REGISTERING_DID);

            let registerResponse = await customApi.post('/register-did', { did: newDid });
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

            // Step 4: Update local storage
            setCurrentStep(MIGRATION_STEPS.UPDATING_STORAGE);

            await indexDBUtil.updateAccountAfterDIDMigration(account.username, {
                newDid: newDid,
                newPublicKey: newPublicKey,
                oldDid: account.did,
                oldPublicKey: account.publickey
            });

            // Update local state
            updateAccountStatus(index, 'completed', { newDid, newPublicKey });

            // Update progress
            const progress = ((index + 1) / accountsToUse.length) * 100;
            setOverallProgress(progress);

            // Move to next account
            await migrateAccount(index + 1, accountsToUse);

        } catch (err) {
            console.error(`Migration failed for account ${account.username}:`, err);
            updateAccountStatus(index, 'failed');
            setError(`Failed to migrate ${account.username}: ${err.message}`);
            setCurrentStep(MIGRATION_STEPS.FAILED);
            // Don't continue - all or nothing
        }
    };

    const completeMigration = async () => {
        try {
            setCurrentStep(MIGRATION_STEPS.COMPLETE);
            await indexDBUtil.completeDIDMigration();
            setOverallProgress(100);

            // Notify parent
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
