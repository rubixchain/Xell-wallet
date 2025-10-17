import React, { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../../components/Card';
import PinInput from '../../components/setup/PinInput';
import indexDBUtil from '../../indexDB';
import toast from 'react-hot-toast';
import { UserContext } from '../../context/userContext';
import { ROUTES } from '../../utils/constants';
import { EXECUTE_API } from '../../utils';
import { WALLET_TYPES } from '../../enums';
import { ENUMS } from '../../enums';
import DeletedAccountsModal from '../../components/modals/DeletedAccountsModal';

function MigrationSetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUserDetails, setIsUserLoggedIn } = useContext(UserContext);

    const { passwords, accounts } = location.state || {};

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [confirmError, setConfirmError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [deletedAccounts, setDeletedAccounts] = useState([]);

    if (!passwords || !accounts) {
        navigate('/migration/intro');
        return null;
    }

    const handleNewPasswordChange = (pin) => {
        setNewPassword(pin);
        setError('');
    };

    const handleConfirmPasswordChange = (pin) => {
        setConfirmPassword(pin);
        setConfirmError('');
    };

    const handleSetPassword = async () => {
        if (newPassword.length !== 6) {
            setError('PIN must be 6 digits');
            return;
        }

        if (confirmPassword.length !== 6) {
            setConfirmError('PIN must be 6 digits');
            return;
        }

        if (newPassword !== confirmPassword) {
            setConfirmError('PINs do not match');
            return;
        }

        setIsProcessing(true);

        try {
            const result = await indexDBUtil.setUnifiedPassword(newPassword, passwords);

            if (!result.status) {
                setError('Failed to set password. Please try again.');
                setIsProcessing(false);
                return;
            }

            if (result.deleted && result.deleted.length > 0) {
                setDeletedAccounts(result.deleted);
                setShowDeletedModal(true);
            } else {
                await loginToFirstAccount();
            }
        } catch (error) {
            setError('Failed to set password. Please try again.');
            toast.error('Migration failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const loginToFirstAccount = async () => {
        try {
            const firstAccount = accounts[0];
            const accountData = await indexDBUtil.validateAndGetAccount(
                firstAccount.username,
                newPassword
            );

            if (!accountData.status) {
                toast.error('Login failed');
                navigate(ROUTES.LOGIN);
                return;
            }

            const getActivenetwork = await indexDBUtil.getNetworksByDID(accountData.data.did) || [];
            const activeNetwork = getActivenetwork?.find(item => item?.selected);

            let networkConfig;
            if (activeNetwork) {
                networkConfig = {
                    network: activeNetwork?.id,
                    RPCUrl: activeNetwork?.rpcUrls?.find(item => item?.selected)?.url,
                    name: activeNetwork?.name,
                    tokenSymbol: activeNetwork?.tokenSymbol
                };
            }

            await indexDBUtil.storeNetworkSetting(networkConfig);

            localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }));
            localStorage.setItem("currentUser", JSON.stringify({
                username: accountData.data.username,
                network: accountData.data.network
            }));

            await EXECUTE_API({
                data: {
                    ...accountData.data,
                    tokenSymbol: networkConfig?.tokenSymbol
                },
                type: WALLET_TYPES.STORE_USER_DETAILS
            });

            setIsUserLoggedIn(true);
            setUserDetails({
                ...accountData.data,
                tokenSymbol: networkConfig?.tokenSymbol
            });

            localStorage.setItem(ENUMS.INITIAL_ACTIVE_TIME, JSON.stringify(Date.now()));

            toast.success('Migration completed successfully');
            navigate(ROUTES.DASHBOARD, { replace: true });
        } catch (error) {
            toast.error('Login failed');
            navigate(ROUTES.LOGIN);
        }
    };

    const handleDeletedModalContinue = async () => {
        setShowDeletedModal(false);
        await loginToFirstAccount();
    };

    return (
        <>
            <Card>
                <div className="flex w-full h-full flex-col justify-center items-center py-5 px-6">
                    <h1 className="text-2xl font-bold text-center text-senary mb-2">
                        Set New Unified Password
                    </h1>
                    <p className="text-center text-sm text-quinary mb-6">
                        This password will work for all your accounts
                    </p>

                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-secondary/20 p-3 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-senary">Create PIN</h2>
                                <p className="text-sm text-quinary">Choose a secure 6-digit PIN</p>
                            </div>
                        </div>

                        <PinInput
                            onChange={handleNewPasswordChange}
                            value={newPassword}
                            length={6}
                            error={error}
                        />

                        {error && (
                            <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
                        )}

                        <div className="mt-6 mb-4">
                            <label className="block text-sm font-semibold text-senary mb-3">
                                Confirm PIN
                            </label>

                            <PinInput
                                onChange={handleConfirmPasswordChange}
                                value={confirmPassword}
                                length={6}
                                error={confirmError}
                            />

                            {confirmError && (
                                <p className="text-red-500 text-sm mt-2 text-center">{confirmError}</p>
                            )}
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 mb-6">
                            <p className="text-sm font-semibold text-blue-900 mb-2">PIN Requirements:</p>
                            <ul className="space-y-1 text-sm text-blue-700">
                                <li>• Use only numbers (0-9)</li>
                                <li>• Avoid sequential numbers (e.g., 123456)</li>
                                <li>• Don't use repeating digits (e.g., 111111)</li>
                                <li>• Choose a PIN you haven't used elsewhere</li>
                            </ul>
                        </div>

                        <button
                            onClick={handleSetPassword}
                            disabled={isProcessing || newPassword.length !== 6 || confirmPassword.length !== 6}
                            className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Set Password'}
                        </button>
                    </div>
                </div>
            </Card>

            <DeletedAccountsModal
                isOpen={showDeletedModal}
                onClose={() => {}}
                deletedAccounts={deletedAccounts}
                onContinue={handleDeletedModalContinue}
            />
        </>
    );
}

export default MigrationSetPassword;
