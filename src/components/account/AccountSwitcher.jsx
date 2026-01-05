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

export default function AccountSwitcher() {
  const { userDetails, setUserDetails } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

      let getActivenetwork = await indexDBUtil.getNetworksByDID(account?.did) || [];
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
        username: account.username,
        network: account.network
      }));

      await EXECUTE_API({
        data: {
          ...account,
          pin: userDetails?.pin,
          tokenSymbol: networkSetting?.tokenSymbol
        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });

      setUserDetails({
        ...account,
        pin: userDetails?.pin,
        tokenSymbol: networkSetting?.tokenSymbol
      });

      setIsOpen(false);
      toast.success(`Switched to ${account.username}`);
    } catch (error) {
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
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
            {userDetails?.username}
          </span>
          <FiChevronDown
            className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {userDetails?.did?.slice(0, 5) + '....' + userDetails?.did?.slice(-5)}
          </span>
          <button
            onClick={(e) => handleCopyDid(e, userDetails?.did)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <FiCopy className="w-4 h-4" />
          </button>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-1/2 -translate-x-1/2 top-14 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg min-w-[220px] overflow-hidden"
          >
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">
                Switch Account
              </p>
            </div>

            <div className="max-h-[200px] overflow-y-auto">
              {accounts.map((account) => (
                <motion.button
                  key={account.username}
                  onClick={() => handleAccountSwitch(account)}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    account.username === userDetails?.username ? 'bg-primary/5' : ''
                  }`}
                  whileHover={{ x: 2 }}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      @{account.username}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {account.did?.slice(0, 8)}...{account.did?.slice(-6)}
                    </span>
                  </div>
                  {account.username === userDetails?.username && (
                    <FiCheck className="w-4 h-4 text-primary" />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="p-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
              <button
                onClick={handleCreateWallet}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Create Wallet
              </button>
              <button
                onClick={handleImportWallet}
                className="w-full px-3 py-2 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                Import Wallet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
