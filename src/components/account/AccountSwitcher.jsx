import { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiCopy, FiPlus, FiCheck, FiDownload } from 'react-icons/fi';
import { UserContext } from '../../context/userContext';
import indexDBUtil from '../../indexDB';
import { NETWORK_TYPES } from '../../../config';
import toast from 'react-hot-toast';
import { EXECUTE_API } from '../../utils';
import { WALLET_TYPES } from '../../enums';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routes';
import SingleAccountDIDMigration from '../migration/SingleAccountDIDMigration';

export default function AccountSwitcher() {
  const { userDetails, setUserDetails } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [pendingAccount, setPendingAccount] = useState(null);
  const popupRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const fetchAccounts = async () => {
      const res = await indexDBUtil.getData();
      if (res?.status) {
        setAccounts(res.data);
      }
    };
    fetchAccounts();
  }, [isOpen]);

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

      const needsMigration = await indexDBUtil.accountNeedsDIDMigration(account.username);

      if (needsMigration) {
        setPendingAccount(account);
        setShowMigration(true);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

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

      await EXECUTE_API({
        data: {
          ...accountToUse,
          pin: userDetails?.pin,
          tokenSymbol: networkSetting?.tokenSymbol
        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });

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

  const handleMigrationComplete = async () => {
    setShowMigration(false);
    if (pendingAccount) {
      await completeAccountSwitch(pendingAccount);
      setPendingAccount(null);
    }
  };

  const handleMigrationError = () => {
    setShowMigration(false);
    setPendingAccount(null);
    toast.error('Migration failed. Please try again.');
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
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
        whileTap={{ scale: 0.98 }}
        aria-label="Switch account"
        tabIndex={0}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
            {userDetails?.username}
          </span>
          <FiChevronDown
            className={`w-5 h-5 text-black dark:text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {userDetails?.did?.slice(0, 5) + '....' + userDetails?.did?.slice(-5)}
          </span>
          <button
            onClick={(e) => handleCopyDid(e, userDetails?.did)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Copy DID"
            tabIndex={0}
          >
            <FiCopy className="w-4 h-4" />
          </button>
        </div>
      </motion.button>

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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-[280px] overflow-hidden mx-4"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-medium text-secondary uppercase tracking-wide">
                Switch Account
              </span>
            </div>

            <div
              className="max-h-[180px] overflow-y-scroll pr-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#d1d5db #f3f4f6'
              }}
            >
              {accounts.map((account) => {
                const isActive = account.username === userDetails?.username;
                return (
                  <button
                    key={account.username}
                    onClick={() => handleAccountSwitch(account)}
                    className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-colors text-left ${
                      isActive
                        ? 'bg-tertiary/60'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    aria-label={`Switch to ${account.username}`}
                    tabIndex={0}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      isActive
                        ? 'bg-secondary text-white'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}>
                      {account.username?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium truncate ${
                          isActive ? 'text-secondary' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          @{account.username}
                        </span>
                        {isActive && (
                          <FiCheck className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block truncate">
                        {account.did?.slice(0, 8)}...{account.did?.slice(-5)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
              <button
                onClick={handleCreateWallet}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWallet()}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-secondary hover:bg-tertiary/50 rounded-lg transition-colors"
                aria-label="Create new wallet"
                tabIndex={0}
              >
                <FiPlus className="w-4 h-4" />
                Create Wallet
              </button>
              <button
                onClick={handleImportWallet}
                onKeyDown={(e) => e.key === 'Enter' && handleImportWallet()}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                aria-label="Import wallet"
                tabIndex={0}
              >
                <FiDownload className="w-4 h-4" />
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

      {showMigration && pendingAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[360px] max-h-[500px] overflow-hidden mx-4 p-4">
            <SingleAccountDIDMigration
              username={pendingAccount.username}
              unifiedPassword={userDetails?.pin}
              onComplete={handleMigrationComplete}
              onError={handleMigrationError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
