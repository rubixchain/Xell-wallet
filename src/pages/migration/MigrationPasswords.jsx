import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import indexDBUtil from '../../indexDB';
import toast from 'react-hot-toast';
import InvalidPasswordsModal from '../../components/modals/InvalidPasswordsModal';

function MigrationPasswords() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [passwords, setPasswords] = useState({});
    const [errors, setErrors] = useState({});
    const [isValidating, setIsValidating] = useState(false);
    const [showInvalidModal, setShowInvalidModal] = useState(false);
    const [invalidAccounts, setInvalidAccounts] = useState([]);
    const [forgottenAccounts, setForgottenAccounts] = useState({});
    const [attemptCounts, setAttemptCounts] = useState({});

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const accountList = await indexDBUtil.getAllAccountsForMigration();
            setAccounts(accountList);
            if (accountList.length > 0) {
                const initialPasswords = {};
                const initialForgotten = {};
                const initialAttempts = {};
                accountList.forEach(acc => {
                    initialPasswords[acc.username] = '';
                    initialForgotten[acc.username] = false;
                    initialAttempts[acc.username] = 0;
                });
                setPasswords(initialPasswords);
                setForgottenAccounts(initialForgotten);
                setAttemptCounts(initialAttempts);
            }
        } catch (error) {
            toast.error('Failed to load accounts');
        }
    };

    const handlePasswordChange = (username, value) => {
        setPasswords(prev => ({
            ...prev,
            [username]: value
        }));
        setErrors(prev => ({
            ...prev,
            [username]: ''
        }));
    };

    const handleForgottenChange = (username, checked) => {
        setForgottenAccounts(prev => ({
            ...prev,
            [username]: checked
        }));
        if (checked) {
            // Clear password if marked as forgotten
            setPasswords(prev => ({
                ...prev,
                [username]: ''
            }));
            setErrors(prev => ({
                ...prev,
                [username]: ''
            }));
        }
    };

    const handleValidate = async () => {
        // Get accounts that are marked as forgotten
        const forgottenUsernames = Object.keys(forgottenAccounts).filter(username => forgottenAccounts[username]);

        // Check if non-forgotten accounts have passwords filled
        const accountsNeedingPasswords = accounts.filter(acc => !forgottenAccounts[acc.username]);
        const allNonForgottenFilled = accountsNeedingPasswords.every(acc => passwords[acc.username]?.length === 6);

        if (!allNonForgottenFilled) {
            toast.error('Please enter PIN for all accounts or mark them as forgotten');
            return;
        }

        // If there are forgotten accounts, validate the rest first
        if (forgottenUsernames.length > 0) {
            setIsValidating(true);
            try {
                // Only validate non-forgotten accounts
                const passwordsToValidate = { ...passwords };
                forgottenUsernames.forEach(username => {
                    delete passwordsToValidate[username];
                });

                const result = await indexDBUtil.validateMultiplePasswords(passwordsToValidate);

                if (result.invalid.length === 0) {
                    // Show modal with only forgotten accounts
                    setInvalidAccounts([]);
                    setShowInvalidModal(true);
                } else {
                    // Increment attempt count and check if should auto-forget
                    const newErrors = {};
                    const newAttempts = { ...attemptCounts };
                    const newForgotten = { ...forgottenAccounts };

                    result.invalid.forEach(username => {
                        newAttempts[username] = (newAttempts[username] || 0) + 1;

                        if (newAttempts[username] >= 3) {
                            // Auto-check "I forgot my PIN" after 3 failed attempts
                            newForgotten[username] = true;
                            newErrors[username] = 'Too many attempts. Marked as forgotten.';
                        } else {
                            newErrors[username] = `Invalid PIN (Attempt ${newAttempts[username]}/3)`;
                        }
                    });

                    setAttemptCounts(newAttempts);
                    setForgottenAccounts(newForgotten);
                    setErrors(newErrors);
                    setInvalidAccounts(result.invalid);
                    setShowInvalidModal(true);
                }
            } catch (error) {
                toast.error('Failed to validate PINs');
            } finally {
                setIsValidating(false);
            }
            return;
        }

        setIsValidating(true);

        try {
            const result = await indexDBUtil.validateMultiplePasswords(passwords);

            if (result.invalid.length === 0) {
                navigate('/migration/set-password', {
                    state: { passwords, accounts }
                });
            } else {
                // Increment attempt count and check if should auto-forget
                const newErrors = {};
                const newAttempts = { ...attemptCounts };
                const newForgotten = { ...forgottenAccounts };

                result.invalid.forEach(username => {
                    newAttempts[username] = (newAttempts[username] || 0) + 1;

                    if (newAttempts[username] >= 3) {
                        // Auto-check "I forgot my PIN" after 3 failed attempts
                        newForgotten[username] = true;
                        newErrors[username] = 'Too many attempts. Marked as forgotten.';
                    } else {
                        newErrors[username] = `Invalid PIN (Attempt ${newAttempts[username]}/3)`;
                    }
                });

                setAttemptCounts(newAttempts);
                setForgottenAccounts(newForgotten);
                setErrors(newErrors);
                setInvalidAccounts(result.invalid);
                setShowInvalidModal(true);
            }
        } catch (error) {
            toast.error('Failed to validate PINs');
        } finally {
            setIsValidating(false);
        }
    };

    const handleModalGoBack = () => {
        setShowInvalidModal(false);
    };

    const handleModalContinue = () => {
        setShowInvalidModal(false);

        // Get all accounts to delete (both forgotten and invalid)
        const forgottenUsernames = Object.keys(forgottenAccounts).filter(username => forgottenAccounts[username]);
        const allAccountsToDelete = [...new Set([...invalidAccounts, ...forgottenUsernames])];

        // Remove deleted accounts from passwords map
        const validPasswords = { ...passwords };
        allAccountsToDelete.forEach(username => {
            delete validPasswords[username];
        });

        // Navigate with only valid accounts
        const validAccounts = accounts.filter(acc => !allAccountsToDelete.includes(acc.username));
        navigate('/migration/set-password', {
            state: { passwords: validPasswords, accounts: validAccounts }
        });
    };

    if (accounts.length === 0) {
        return (
            <Card>
                <div className="flex w-full h-full flex-col justify-center items-center">
                    <p>Loading accounts...</p>
                </div>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <div className="flex w-full h-full flex-col justify-between py-5 px-6">
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <h1 className="text-2xl font-bold text-center text-senary mb-2">
                            Enter Account Passwords
                        </h1>
                        <p className="text-center text-sm text-quinary mb-6">
                            Please enter the password for each account
                        </p>

                        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                            {accounts.map((account) => (
                                <div key={account.username} className="space-y-2">
                                    <div className="bg-surface-low rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-quinary">@</span>
                                            <span className='text-senary font-medium text-sm'>{account.username}</span>
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="Enter 6-digit PIN"
                                            value={passwords[account.username] || ''}
                                            onChange={(e) => handlePasswordChange(account.username, e.target.value)}
                                            maxLength={6}
                                            disabled={forgottenAccounts[account.username]}
                                            className={`w-full bg-surface-high text-senary px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                                                errors[account.username]
                                                    ? 'ring-2 ring-red-500'
                                                    : 'focus:ring-secondary'
                                            } ${forgottenAccounts[account.username] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        {errors[account.username] && (
                                            <p className="text-red-500 text-sm mt-1">{errors[account.username]}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                type="checkbox"
                                                id={`forgot-${account.username}`}
                                                checked={forgottenAccounts[account.username] || false}
                                                onChange={(e) => handleForgottenChange(account.username, e.target.checked)}
                                                disabled={(attemptCounts[account.username] || 0) >= 3}
                                                className="w-4 h-4 text-secondary rounded focus:ring-2 focus:ring-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <label
                                                htmlFor={`forgot-${account.username}`}
                                                className={`text-sm ${(attemptCounts[account.username] || 0) >= 3 ? 'text-red-500 font-medium' : 'text-quinary cursor-pointer'}`}
                                            >
                                                {(attemptCounts[account.username] || 0) >= 3
                                                    ? 'Too many attempts - Account will be deleted'
                                                    : 'I forgot my PIN for this account'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleValidate}
                        disabled={isValidating}
                        className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:cursor-not-allowed"
                    >
                        {isValidating ? 'Validating...' : 'Validate & Continue'}
                    </button>
                </div>
            </Card>

            {showInvalidModal && (
                <InvalidPasswordsModal
                    invalidAccounts={invalidAccounts}
                    forgottenAccounts={Object.keys(forgottenAccounts).filter(username => forgottenAccounts[username])}
                    attemptCounts={attemptCounts}
                    onGoBack={handleModalGoBack}
                    onContinue={handleModalContinue}
                />
            )}
        </>
    );
}

export default MigrationPasswords;
