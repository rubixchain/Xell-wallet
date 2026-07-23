import { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiCopy, FiPlus, FiCheck, FiDownload } from 'react-icons/fi';
import { UserContext } from '../../context/userContext';
import indexDBUtil from '../../indexDB';
import { END_POINTS } from '../../api/endpoints';
import { NETWORK_TYPES } from '../../../config';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routes';

export default function AccountSwitcher() {
    const { userDetails, setUserDetails } = useContext(UserContext);
    const [isOpen, setIsOpen] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    // RBT balance per account DID, fetched when the switcher opens.
    const [balances, setBalances] = useState({});
    const popupRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;
        const fetchAccounts = async () => {
            const res = await indexDBUtil.getData();
            if (res?.success) {
                setAccounts(res.data);
                fetchBalances(res.data);
            }
        };
        fetchAccounts();
    }, [isOpen]);

    const fetchBalances = async (accountList) => {
        await Promise.all(
            (accountList || []).map(async (account) => {
                if (!account?.did) return;
                try {
                    const res = await END_POINTS.get_rbt_balance(account.did);
                    if (res?.status) {
                        setBalances((prev) => ({ ...prev, [account.did]: res?.result?.balance ?? 0 }));
                    }
                } catch {
                    // Leave the balance undefined; the row just won't show an amount.
                }
            })
        );
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAccountSwitch = async (account) => {
        if (account.username === userDetails?.username) {
            setIsOpen(false);
            return;
        }

        try {
            setIsLoading(true);

            // V6: No migration needed - switch directly
            await completeAccountSwitch(account);
        } catch {
            toast.error('Failed to switch account');
            setIsLoading(false);
        }
    };

    const completeAccountSwitch = async (account) => {
        try {
            setIsLoading(true);

            const freshAccountDataResponse = await indexDBUtil.getDecryptedAccountData(account.username, userDetails?.pin);
            const freshAccountData = freshAccountDataResponse?.status ? freshAccountDataResponse.data : null;
            const accountToUse = freshAccountData || account;

            let getActivenetwork = await indexDBUtil.getNetworksByDID(accountToUse?.did) || [];
            getActivenetwork = getActivenetwork?.find(item => item?.selected);

            const networkSetting = getActivenetwork ? {
                network: getActivenetwork?.id,
                RPCUrl: getActivenetwork?.rpcUrls?.find(item => item?.selected)?.url,
                name: getActivenetwork?.name,
                tokenSymbol: getActivenetwork?.tokenSymbol
            } : null;

            if (networkSetting) {
                await indexDBUtil.storeNetworkSetting(networkSetting);
            }

            localStorage.setItem("currentUser", JSON.stringify({
                username: accountToUse.username,
                network: accountToUse.network
            }));

            setUserDetails({
                ...accountToUse,
                pin: userDetails?.pin,
                tokenSymbol: networkSetting?.tokenSymbol
            });

            setIsOpen(false);
            toast.success(`Switched to ${accountToUse.username}`);
        } catch {
            toast.error('Failed to switch account');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyDid = (e, did) => {
        e.stopPropagation();
        navigator.clipboard.writeText(did);
        toast.success("Copied to clipboard");
    };

    const handleCreateWallet = () => {
        setIsOpen(false);
        sessionStorage.setItem('previousUserDetails', JSON.stringify(userDetails));
        const currentPin = userDetails?.pin;
        setUserDetails({ network: 1, tokenSymbol: NETWORK_TYPES.RBT, pin: currentPin });
        navigate(routes.CREATE_WALLET, { state: { fromDashboard: true } });
    };

    const handleImportWallet = () => {
        setIsOpen(false);
        sessionStorage.setItem('previousUserDetails', JSON.stringify(userDetails));
        const currentPin = userDetails?.pin;
        setUserDetails({ network: 1, tokenSymbol: NETWORK_TYPES.RBT, pin: currentPin });
        navigate(routes.IMPORT_WALLET, { state: { fromDashboard: true } });
    };

    return (
        <div className="relative" ref={popupRef}>
            <div className="flex flex-col items-center">
                <motion.div
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                    whileTap={{ scale: 0.98 }}
                    role="button"
                    aria-label="Switch account"
                    tabIndex={0}
                >
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                        {userDetails?.username}
                    </span>
                    <FiChevronDown
                        className={`w-5 h-5 text-black dark:text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </motion.div>
                {/* DID — highlighted (bold), truncated on one line, full DID on hover, with copy */}
                <div className="mt-1 flex items-center justify-center gap-1.5">
                    <span className="group relative">
                        <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap cursor-default transition-colors group-hover:text-primary">
                            {`${userDetails?.did?.slice(0, 8)}…${userDetails?.did?.slice(-6)}`}
                        </span>
                        {/* Tooltip with full DID */}
                        <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2.5 flex w-[280px] max-w-[85vw] -translate-x-1/2 translate-y-1 flex-col items-center gap-0.5 rounded-lg bg-primary px-3 py-2 opacity-0 shadow-xl ring-1 ring-white/10 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                        >
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Full DID</span>
                            <span className="font-mono text-xs tracking-tight text-white break-all text-center">{userDetails?.did}</span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-primary" />
                        </span>
                    </span>
                    <button
                        onClick={(e) => handleCopyDid(e, userDetails?.did)}
                        className="p-1 text-gray-500 hover:text-secondary transition-colors flex-shrink-0"
                        aria-label="Copy DID"
                        tabIndex={0}
                    >
                        <FiCopy className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm font-semibold text-secondary uppercase tracking-wide">
                                    Switch Account
                                </span>
                            </div>

                            <div
                                className="max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:block [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:dark:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:dark:bg-gray-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 [&::-webkit-scrollbar-thumb]:dark:hover:bg-gray-400"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#d1d5db #f3f4f6',
                                    scrollbarGutter: 'stable'
                                }}
                            >
                                {accounts.map((account) => {
                                    const isActive = account.username === userDetails?.username;
                                    return (
                                        <button
                                            key={account.username}
                                            onClick={() => handleAccountSwitch(account)}
                                            className={`w-full px-5 py-4 flex items-center gap-4 transition-colors text-left ${
                                                isActive
                                                    ? 'bg-tertiary/60'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                            aria-label={`Switch to ${account.username}`}
                                            tabIndex={0}
                                        >
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                                                isActive
                                                    ? 'bg-secondary text-white'
                                                    : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                            }`}>
                                                {account.username?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium truncate ${
                                                        isActive ? 'text-secondary' : 'text-gray-800 dark:text-gray-200'
                                                    }`}>
                                                        @{account.username}
                                                    </span>
                                                    {isActive && (
                                                        <FiCheck className="w-5 h-5 text-secondary flex-shrink-0" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-gray-400 dark:text-gray-500 block truncate">
                                                    {account.did?.slice(0, 12)}...{account.did?.slice(-8)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end flex-shrink-0">
                                                <span className={`text-sm font-semibold ${
                                                    isActive ? 'text-secondary' : 'text-gray-800 dark:text-gray-200'
                                                }`}>
                                                    {balances[account.did] !== undefined
                                                        ? parseFloat(parseFloat(balances[account.did]).toFixed(3))
                                                        : '—'}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    {account.tokenSymbol || userDetails?.tokenSymbol || 'RBT'}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                <button
                                    onClick={handleCreateWallet}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWallet()}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-secondary hover:bg-tertiary/50 rounded-lg transition-colors"
                                    aria-label="Create new wallet"
                                    tabIndex={0}
                                >
                                    <FiPlus className="w-5 h-5" />
                                    Create Wallet
                                </button>
                                <button
                                    onClick={handleImportWallet}
                                    onKeyDown={(e) => e.key === 'Enter' && handleImportWallet()}
                                    className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                                    aria-label="Import wallet"
                                    tabIndex={0}
                                >
                                    <FiDownload className="w-5 h-5" />
                                    Import Wallet
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isLoading && (
                <div className="fixed inset-0 bg-black/30 z-50 flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-secondary"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Switching...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
