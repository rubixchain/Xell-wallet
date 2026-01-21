import { useEffect, useState, useContext } from 'react';
import Card from '../components/Card';
import PinInput from '../components/setup/PinInput';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { routes } from '../routes/routes';
import { UserContext } from '../context/userContext';
import { ROUTES } from '../utils/constants';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';
import { ENUMS } from '../enums';
import { MigrationModal, DIDMigrationProgress, SingleAccountDIDMigration } from '../components/migration';
import { config, NETWORK_TYPES } from '../../config';


// Logo Component
const Logo = () => (
    <div className="flex items-center gap-2">
        <div className="grid grid-cols-2 gap-0.5">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-yellow-300" />
            ))}
        </div>
        <span className="text-2xl font-bold text-primary">Xell</span>
    </div>
);

// Main App Component
function Login() {
    const { setUserDetails, userDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext)
    const [attempts, setAttempts] = useState(5);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate()

    // Migration states
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [showDIDMigration, setShowDIDMigration] = useState(false);
    const [showSingleAccountMigration, setShowSingleAccountMigration] = useState(false);
    const [unifiedPassword, setUnifiedPassword] = useState('');
    const [isCheckingMigration, setIsCheckingMigration] = useState(true);
    const [accountToMigrate, setAccountToMigrate] = useState(null);

    useEffect(() => {
        (async () => {
            await checkMigrationStatus();

            let res = await indexDBUtil.getData()
            let currentUser = localStorage.getItem("currentUser")
            if (currentUser) {
                setSelectedUser(JSON.parse(currentUser))
                return
            }
            if (res?.status && res?.data?.length > 0) {
                setSelectedUser(res?.data[0])
            }
        })()

    }, [userDetails])

    // Check migration status on component mount
    const checkMigrationStatus = async () => {
        try {
            setIsCheckingMigration(true);

            // Check if migration is needed (version <= 4)
            // Migration includes both password unification and DID migration
            const needsPasswordMigration = await indexDBUtil.needsMigration();

            if (needsPasswordMigration) {
                setShowMigrationModal(true);
                setIsCheckingMigration(false);
                return;
            }

            setIsCheckingMigration(false);
        } catch (error) {
            setIsCheckingMigration(false);
        }
    };

    const handlePinComplete = (enteredPin) => {
        setPin(enteredPin);
    };

    const handleUnlock = async () => {
        if (pin.length === 6) {
            // Check if we need to use unified password validation
            const hasUnified = await indexDBUtil.hasUnifiedPassword();

            if (hasUnified) {
                // Validate using unified password
                const isValid = await indexDBUtil.validateUnifiedPassword(pin);
                if (!isValid) {
                    toast.error('Invalid password');
                    setAttempts(prev => prev - 1);
                    if (attempts == 1) {
                        navigate(ROUTES.WELCOME, { replace: true });
                    }
                    return;
                }

                // Get the target username
                const accounts = await indexDBUtil.getAllAccountsForMigration();
                if (accounts.length === 0) {
                    toast.error('No accounts found');
                    return;
                }
                const targetUsername = selectedUser?.username || accounts[0].username;

                // Check if THIS SPECIFIC ACCOUNT needs DID migration (on-demand migration)
                const accountNeedsMigration = await indexDBUtil.accountNeedsDIDMigration(targetUsername);
                if (accountNeedsMigration) {
                    await indexDBUtil.storeNetworkSetting({
                        network: 1,
                        RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
                        name: "Rubix Mainnet",
                        tokenSymbol: NETWORK_TYPES.RBT
                    });
                    setUnifiedPassword(pin);
                    setAccountToMigrate(targetUsername);
                    setShowSingleAccountMigration(true);
                    return;
                }

                // Account already migrated or no migration needed - proceed to login
                const res = await indexDBUtil.getDecryptedAccountData(targetUsername, pin);

                if (!res.status) {
                    toast.error(res.message || 'Failed to get account data');
                    return;
                }

                await completeLogin(res.data, pin);
            } else {
                // Original login flow (before migration)
                let res = await indexDBUtil.validateAndGetAccount(selectedUser?.username, pin)
                if (!res?.status) {
                    toast.error(res?.message)
                    setAttempts(prev => prev - 1)
                    if (attempts == 1) {
                        navigate(ROUTES.WELCOME, { replace: true })
                    }
                    return
                }

                await completeLogin(res.data, pin);
            }
        }
    };

    const completeLogin = async (userData, pinValue) => {
        await indexDBUtil.ensureUnifiedPassword(pinValue);

        let getActivenetwork = await indexDBUtil.getNetworksByDID(userData?.did) || []
        getActivenetwork = getActivenetwork?.find(item => item?.selected)
        if (getActivenetwork) {
            getActivenetwork = {
                network: getActivenetwork?.id,
                RPCUrl: getActivenetwork?.rpcUrls?.find(item => item?.selected)?.url,
                name: getActivenetwork?.name,
                tokenSymbol: getActivenetwork?.tokenSymbol
            }
        }
        toast.success('Login successful')
        indexDBUtil.storeNetworkSetting({
            network: getActivenetwork?.network,
            RPCUrl: getActivenetwork?.RPCUrl,
            name: getActivenetwork?.name,
            tokenSymbol: getActivenetwork?.tokenSymbol
        })
        localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }))
        localStorage.setItem("currentUser", JSON.stringify({
            username: userData?.username,
            network: userData?.network
        }))
        await EXECUTE_API({
            data: {
                ...userData,
                pin: pinValue,
                tokenSymbol: getActivenetwork?.tokenSymbol

            },
            type: WALLET_TYPES.STORE_USER_DETAILS
        });
        setIsUserLoggedIn(true)
        setUserDetails({
            ...userData,
            did: userData?.did,
            username: userData?.username,
            network: userData?.network,
            pin: pinValue,
            tokenSymbol: getActivenetwork?.tokenSymbol
        })

        localStorage.setItem("currentUser", JSON.stringify({
            username: userData?.username,
            network: userData?.network
        }))
        localStorage.setItem(ENUMS.INITIAL_ACTIVE_TIME, JSON.stringify(Date.now()))
        navigate(routes.DASHBOARD, { replace: true })
    };

    // Handle migration modal lock (after unified password is set)
    const handleMigrationLock = async () => {
        setShowMigrationModal(false);
        setPin('');

        // Reload account list to reflect deleted accounts
        const res = await indexDBUtil.getData();
        if (res?.status) {
            // Update selected user if it was deleted
            const currentUser = localStorage.getItem("currentUser");
            if (currentUser) {
                const parsedUser = JSON.parse(currentUser);
                const userStillExists = res?.data.find(u => u.username === parsedUser.username);
                if (userStillExists) {
                    setSelectedUser(parsedUser);
                } else {
                    setSelectedUser(res?.data[0]);
                }
            } else {
                setSelectedUser(res?.data[0]);
            }
        }
    };

    // Handle DID migration complete (bulk - legacy)
    const handleDIDMigrationComplete = async () => {
        setShowDIDMigration(false);

        // Now complete the login
        if (unifiedPassword && selectedUser?.username) {
            const res = await indexDBUtil.getDecryptedAccountData(selectedUser.username, unifiedPassword);
            if (res.status) {
                await completeLoginAfterMigration(res.data, unifiedPassword);
            }
        }
    };

    // Handle DID migration error (bulk - legacy)
    const handleDIDMigrationError = (error) => {
        toast.error(error);
        setShowDIDMigration(false);
        setUnifiedPassword('');
    };

    // Handle single account DID migration complete
    const handleSingleAccountMigrationComplete = async () => {
        setShowSingleAccountMigration(false);

        // Now complete the login with the migrated account
        if (unifiedPassword && accountToMigrate) {
            const res = await indexDBUtil.getDecryptedAccountData(accountToMigrate, unifiedPassword);
            if (res.status) {
                await completeLoginAfterMigration(res.data, unifiedPassword);
            } else {
                toast.error(res.message || 'Failed to get account data after migration');
            }
        }

        // Clear migration state
        setAccountToMigrate(null);
        setUnifiedPassword('');
    };

    const completeLoginAfterMigration = async (userData, pinValue) => {
        await indexDBUtil.ensureUnifiedPassword(pinValue);

        const rubixMainnetNetwork = {
            network: 1,
            RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
            name: "Rubix Mainnet",
            tokenSymbol: NETWORK_TYPES.RBT
        };

        toast.success('Login successful');
        await indexDBUtil.storeNetworkSetting(rubixMainnetNetwork);

        localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }));
        localStorage.setItem("currentUser", JSON.stringify({
            username: userData?.username,
            network: 1
        }));

        await EXECUTE_API({
            data: {
                ...userData,
                pin: pinValue,
                network: 1,
                tokenSymbol: NETWORK_TYPES.RBT
            },
            type: WALLET_TYPES.STORE_USER_DETAILS
        });

        setIsUserLoggedIn(true);
        setUserDetails({
            ...userData,
            did: userData?.did,
            username: userData?.username,
            network: 1,
            pin: pinValue,
            tokenSymbol: NETWORK_TYPES.RBT
        });

        localStorage.setItem(ENUMS.INITIAL_ACTIVE_TIME, JSON.stringify(Date.now()));
        navigate(routes.DASHBOARD, { replace: true });
    };

    // Handle single account DID migration error
    const handleSingleAccountMigrationError = (error) => {
        toast.error(error);
        setShowSingleAccountMigration(false);
        setAccountToMigrate(null);
        setUnifiedPassword('');
    };

    // Show loading while checking migration
    if (isCheckingMigration) {
        return (
            <Card>
                <div className="flex w-full h-full flex-col justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="mt-4 text-quinary">Loading...</p>
                </div>
            </Card>
        );
    }

    // Show unified password migration modal
    if (showMigrationModal) {
        return (
            <MigrationModal
                onLock={handleMigrationLock}
            />
        );
    }

    // Show DID migration progress (bulk - legacy)
    if (showDIDMigration) {
        return (
            <Card>
                <DIDMigrationProgress
                    unifiedPassword={unifiedPassword}
                    onComplete={handleDIDMigrationComplete}
                    onError={handleDIDMigrationError}
                />
            </Card>
        );
    }

    // Show single account DID migration (on-demand)
    if (showSingleAccountMigration && accountToMigrate) {
        return (
            <Card>
                <SingleAccountDIDMigration
                    username={accountToMigrate}
                    unifiedPassword={unifiedPassword}
                    onComplete={handleSingleAccountMigrationComplete}
                    onError={handleSingleAccountMigrationError}
                />
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex w-full h-full flex-col justify-center items-center y-5">

                <div className='flex items-center'>
                    <img
                        src="/images/xell-wallet.svg"
                        alt="Xell Wallet Logo"
                        style={{ width: '100px', height: 'auto' }}
                    />
                </div>

                <h1 className="text-3xl font-extrabold text-center text-senary mb-3 mt-6">
                    Welcome back
                </h1>
                <p className="text-center text-sm font-medium text-quinary mb-5">
                    Enter your PIN to unlock your wallet
                </p>

                <div className="mb-8 w-full">
                    <div className="w-full flex items-center justify-center px-4 py-3 bg-surface-low rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-quinary">@</span>
                            <span className="text-senary font-medium text-sm">{selectedUser?.username}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <PinInput
                        onChange={handlePinComplete}
                        value={pin}
                        length={6}
                        error={error}
                        onComplete={handleUnlock}
                    />
                    {/* <SetupPin onSubmit={handlePinComplete} error={error} /> */}
                    <p className="text-center text-sm text-quinary mt-4">
                        {attempts} of 5 attempts remaining
                    </p>
                </div>

                <button
                    onClick={handleUnlock}
                    disabled={pin.length !== 6}
                    className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-4 px-6 rounded-lg transition-colors disabled:bg-disabled disabled:cursor-not-allowed"
                >
                    Unlock
                </button>
            </div>
        </Card>
    );
}

export default Login;
