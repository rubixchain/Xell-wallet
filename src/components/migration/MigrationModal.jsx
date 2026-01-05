import React, { useState, useEffect } from 'react';
import { FiShield, FiLock } from 'react-icons/fi';
import AccountMigrationCard from './AccountMigrationCard';
import SetUnifiedPasswordStep from './SetUnifiedPasswordStep';
import ImportMnemonicModal from './ImportMnemonicModal';
import Card from '../Card';
import indexDBUtil from '../../indexDB';
import toast from 'react-hot-toast';
import { deriveKeysFromMnemonic } from '../../utils/migration';

// Migration steps
const STEPS = {
    COLLECT_PASSWORDS: 1,
    SET_UNIFIED_PASSWORD: 2,
    COMPLETE: 3
};

const MigrationModal = ({ onLock }) => {
    const [currentStep, setCurrentStep] = useState(STEPS.COLLECT_PASSWORDS);
    const [accounts, setAccounts] = useState([]);
    const [accountStates, setAccountStates] = useState({});
    // accountStates: { username: { status: 'pending'|'validated'|'skipped'|'imported', password: '', mnemonic: '' } }

    const [showImportModal, setShowImportModal] = useState(false);
    const [importingAccount, setImportingAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setIsLoading(true);
            const accountList = await indexDBUtil.getAllAccountsForMigration();
            setAccounts(accountList);

            // Initialize account states
            const initialStates = {};
            accountList.forEach(acc => {
                initialStates[acc.username] = {
                    status: 'pending',
                    password: '',
                    mnemonic: null
                };
            });
            setAccountStates(initialStates);
        } catch (error) {
            toast.error('Failed to load accounts');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle password validation for an account
    const handlePasswordValidation = async (username, password) => {
        try {
            const result = await indexDBUtil.validateAccountPassword(username, password);

            if (result.valid) {
                setAccountStates(prev => ({
                    ...prev,
                    [username]: {
                        ...prev[username],
                        status: 'validated',
                        password: password
                    }
                }));
                return { success: true };
            } else {
                return { success: false, message: result.message || 'Invalid password' };
            }
        } catch (error) {
            return { success: false, message: 'Validation failed' };
        }
    };

    // Handle skip checkbox toggle
    const handleSkipToggle = (username, isSkipped) => {
        setAccountStates(prev => ({
            ...prev,
            [username]: {
                ...prev[username],
                status: isSkipped ? 'skipped' : 'pending',
                password: '',
                mnemonic: null
            }
        }));
    };

    // Handle import button click
    const handleImportClick = (username) => {
        setImportingAccount(username);
        setShowImportModal(true);
    };

    // Handle mnemonic import
    const handleMnemonicImport = async (mnemonic) => {
        if (!importingAccount) return { success: false, message: 'No account selected' };

        try {
            // Derive keys from mnemonic
            const keys = deriveKeysFromMnemonic(mnemonic);

            // Find the account we're trying to import for
            const targetAccount = accounts.find(acc => acc.username === importingAccount);

            if (!targetAccount) {
                return { success: false, message: 'Account not found' };
            }

            // Check if the mnemonic matches this account's public key
            // Try all possible derivation methods (new BIP32 and legacy)
            const isNewBIP32Match = targetAccount.publickey === keys.compressedPublicKey ||
                                     targetAccount.publickey === keys.uncompressedPublicKey;
            const isLegacyMatch = targetAccount.publickey === keys.legacyCompressedPublicKey ||
                                  targetAccount.publickey === keys.legacyUncompressedPublicKey;

            if (!isNewBIP32Match && !isLegacyMatch) {
                return { success: false, message: 'Recovery phrase does not match this account' };
            }

            // Success - update account state
            setAccountStates(prev => ({
                ...prev,
                [importingAccount]: {
                    status: 'imported',
                    password: '',
                    mnemonic: mnemonic
                }
            }));

            setShowImportModal(false);
            setImportingAccount(null);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message || 'Invalid recovery phrase' };
        }
    };

    // Check if we can proceed to next step
    const canProceed = () => {
        const states = Object.values(accountStates);

        // All accounts must be either validated, imported, or skipped
        const allHandled = states.every(s =>
            s.status === 'validated' || s.status === 'imported' || s.status === 'skipped'
        );

        // At least one account must be validated or imported (not all skipped)
        const hasValidAccount = states.some(s =>
            s.status === 'validated' || s.status === 'imported'
        );

        return allHandled && hasValidAccount;
    };

    // Handle continue to set unified password
    const handleContinue = () => {
        if (!canProceed()) {
            toast.error('Please handle all accounts before continuing');
            return;
        }
        setCurrentStep(STEPS.SET_UNIFIED_PASSWORD);
    };

    // Handle unified password set
    const handleUnifiedPasswordSet = async (newPassword) => {
        setIsProcessing(true);

        try {
            // Build account data map
            const accountDataMap = {};
            const skipAccounts = [];

            Object.entries(accountStates).forEach(([username, state]) => {
                if (state.status === 'skipped') {
                    skipAccounts.push(username);
                } else if (state.status === 'validated') {
                    accountDataMap[username] = { oldPassword: state.password };
                } else if (state.status === 'imported') {
                    accountDataMap[username] = { mnemonic: state.mnemonic };
                }
            });

            // Set unified password and re-encrypt accounts
            const result = await indexDBUtil.setUnifiedPassword(newPassword, accountDataMap, skipAccounts);

            if (result.status) {
                // Check if current user in localStorage was skipped
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    const currentUser = JSON.parse(currentUserStr);
                    if (skipAccounts.includes(currentUser.username)) {
                        // Current user was deleted, switch to first migrated account
                        const firstMigratedUsername = result.migratedAccounts[0];
                        if (firstMigratedUsername) {
                            localStorage.setItem('currentUser', JSON.stringify({
                                username: firstMigratedUsername,
                                pin: newPassword
                            }));
                        }
                    }
                }

                toast.success('Password unified successfully!');
                setCurrentStep(STEPS.COMPLETE);

                // Lock wallet and redirect to login
                setTimeout(() => {
                    if (onLock) onLock();
                }, 1500);
            } else {
                toast.error(result.message || 'Failed to set unified password');
            }
        } catch (error) {
            toast.error('Migration failed: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Calculate progress
    const getProgress = () => {
        const states = Object.values(accountStates);
        const handled = states.filter(s =>
            s.status === 'validated' || s.status === 'imported' || s.status === 'skipped'
        ).length;
        return { handled, total: states.length };
    };

    // Render step 1: Collect passwords
    const renderCollectPasswordsStep = () => {
        const progress = getProgress();

        return (
            <div className="flex flex-col h-full pt-4 pb-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-tertiary p-2.5 rounded-xl">
                        <FiShield className="text-secondary" size={22} />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-lg text-senary leading-tight">Security Upgrade</h2>
                        <p className="text-quinary text-xs">Verify your accounts to continue</p>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-quinary">Progress</span>
                        <span className="text-xs font-medium text-senary">{progress.handled}/{progress.total} accounts</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-secondary rounded-full transition-all duration-300"
                            style={{ width: `${progress.total > 0 ? (progress.handled / progress.total) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Info box - more concise */}
                <div className="bg-tertiary/60 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-senary leading-relaxed">
                        Enter current PIN for each account, or use recovery phrase to verify.
                    </p>
                </div>

                {/* Account list - takes remaining space */}
                <div className="flex-1 overflow-y-auto space-y-2.5 mb-4 pr-1">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary border-t-transparent"></div>
                        </div>
                    ) : (
                        accounts.map((account, index) => (
                            <AccountMigrationCard
                                key={account.username}
                                account={account}
                                state={accountStates[account.username]}
                                onPasswordValidate={(password) => handlePasswordValidation(account.username, password)}
                                onSkipToggle={(isSkipped) => handleSkipToggle(account.username, isSkipped)}
                                onImportClick={() => handleImportClick(account.username)}
                                autoFocus={index === 0}
                            />
                        ))
                    )}
                </div>

                {/* Continue button - stays at bottom */}
                <div className="mt-auto">
                    <button
                        onClick={handleContinue}
                        disabled={!canProceed()}
                        className={`w-full font-semibold py-3 px-6 rounded-xl transition-all duration-200 ${
                            canProceed()
                                ? 'bg-secondary hover:bg-primary text-white shadow-sm hover:shadow-md'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    };

    // Render step 2: Set unified password
    const renderSetUnifiedPasswordStep = () => (
        <SetUnifiedPasswordStep
            onSubmit={handleUnifiedPasswordSet}
            onBack={() => setCurrentStep(STEPS.COLLECT_PASSWORDS)}
            isProcessing={isProcessing}
        />
    );

    // Render step 3: Complete
    const renderCompleteStep = () => (
        <div className="flex flex-col items-center justify-center h-full py-10">
            <div className="bg-green-100 p-6 rounded-full mb-6">
                <FiLock className="text-green-600" size={48} />
            </div>
            <h2 className="font-semibold text-2xl text-senary mb-2">Password Unified!</h2>
            <p className="text-quinary text-center mb-6">
                Your wallet will now lock. Use your new unified password to unlock and complete the DID migration.
            </p>
            <div className="animate-pulse text-sm text-gray-500">
                Redirecting to login...
            </div>
        </div>
    );

    return (
        <Card>
            <div className="flex flex-col flex-1 min-h-0">
                {currentStep === STEPS.COLLECT_PASSWORDS && renderCollectPasswordsStep()}
                {currentStep === STEPS.SET_UNIFIED_PASSWORD && renderSetUnifiedPasswordStep()}
                {currentStep === STEPS.COMPLETE && renderCompleteStep()}
            </div>

            {/* Import Mnemonic Modal */}
            {showImportModal && (
                <ImportMnemonicModal
                    accountName={importingAccount}
                    onImport={handleMnemonicImport}
                    onClose={() => {
                        setShowImportModal(false);
                        setImportingAccount(null);
                    }}
                />
            )}
        </Card>
    );
};

export default MigrationModal;
