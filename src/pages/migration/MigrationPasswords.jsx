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

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const accountList = await indexDBUtil.getAllAccountsForMigration();
            setAccounts(accountList);
            if (accountList.length > 0) {
                const initialPasswords = {};
                accountList.forEach(acc => {
                    initialPasswords[acc.username] = '';
                });
                setPasswords(initialPasswords);
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

    const handleValidate = async () => {
        const allFilled = Object.values(passwords).every(pwd => pwd.length === 6);
        if (!allFilled) {
            toast.error('Please enter password for all accounts');
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
                const newErrors = {};
                result.invalid.forEach(username => {
                    newErrors[username] = 'Invalid password';
                });
                setErrors(newErrors);
                setInvalidAccounts(result.invalid);
                setShowInvalidModal(true);
            }
        } catch (error) {
            toast.error('Failed to validate passwords');
        } finally {
            setIsValidating(false);
        }
    };

    const handleModalGoBack = () => {
        setShowInvalidModal(false);
    };

    const handleModalContinue = () => {
        setShowInvalidModal(false);
        // Remove invalid accounts from the passwords map
        const validPasswords = { ...passwords };
        invalidAccounts.forEach(username => {
            delete validPasswords[username];
        });
        // Navigate with only valid accounts
        const validAccounts = accounts.filter(acc => !invalidAccounts.includes(acc.username));
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
                                            placeholder="Enter 6-digit password"
                                            value={passwords[account.username] || ''}
                                            onChange={(e) => handlePasswordChange(account.username, e.target.value)}
                                            maxLength={6}
                                            className={`w-full bg-surface-high text-senary px-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                                                errors[account.username]
                                                    ? 'ring-2 ring-red-500'
                                                    : 'focus:ring-secondary'
                                            }`}
                                        />
                                        {errors[account.username] && (
                                            <p className="text-red-500 text-sm mt-1">{errors[account.username]}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleValidate}
                        disabled={isValidating || Object.values(passwords).some(pwd => pwd.length !== 6)}
                        className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:cursor-not-allowed"
                    >
                        {isValidating ? 'Validating...' : 'Validate & Continue'}
                    </button>
                </div>
            </Card>

            {showInvalidModal && (
                <InvalidPasswordsModal
                    invalidAccounts={invalidAccounts}
                    onGoBack={handleModalGoBack}
                    onContinue={handleModalContinue}
                />
            )}
        </>
    );
}

export default MigrationPasswords;
