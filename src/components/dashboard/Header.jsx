import { FiCopy, FiShield, FiGlobe, FiKey, FiDollarSign, FiLogOut, FiClock, FiChevronDown } from 'react-icons/fi';
import RubixLogo from '../RubixLogo';
import NetworkSwitcher from '../network/NetworkSwitcher';
import ContentContainer from '../layout/ContentContainer';
import { useContext, useState, useEffect, useRef } from 'react';
import { UserContext } from '../../context/userContext';
import { BsThreeDotsVertical } from "react-icons/bs";
import toast from 'react-hot-toast';
import { FiBell, FiUser, FiExternalLink, FiSettings, FiLock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import SecuritySettings from '../settings/SecuritySettings';
import NetworkSettings from '../settings/NetworkSettings';
import BackupSettings from '../settings/BackupSettings';
import CurrencySettings from '../settings/CurrencySettings';
import { AnimatePresence, motion } from 'framer-motion';
import indexDBUtil from '../../indexDB';
import { WALLET_TYPES } from '../../enums';
import History from "../../pages/History"
import { EXECUTE_API } from '../../utils';
import { ENUMS } from '../../enums';
import NetworkNodeSelector from '../network/NetworkNodeSelector';
import { END_POINTS } from '../../api/endpoints';

export default function Header() {
  const { userDetails, setUserDetails, setIsUserLoggedIn } = useContext(UserContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [allAccounts, setAllAccounts] = useState([]);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const dropdownRef = useRef(null);
  const accountDropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleClickCopy = () => {
    navigator.clipboard.writeText(userDetails?.did);
    toast.success("Copied to clipboard");
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const dropdownOptions = [
    { icon: <FiShield className="mr-2" />, label: 'Security & Privacy', content: <SecuritySettings /> },
    { icon: <FiGlobe className="mr-2" />, label: 'Chain Connect', content: <NetworkSettings /> },
    { icon: <FiKey className="mr-2" />, label: 'Backup & Recovery', content: <BackupSettings /> },
    { icon: <FiDollarSign className="mr-2" />, label: 'Currency', content: <CurrencySettings /> },
    { icon: <FiClock className="mr-2" />, label: 'History', content: <History isModal={true} /> }
  ];

  const handleOptionClick = (content) => {
    setModalContent(content);
    setModalOpen(true);
    setDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadAllAccounts();
  }, []);

  const loadAllAccounts = async () => {
    try {
      const data = await indexDBUtil.getData();
      if (data?.data) {
        setAllAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleAccountSwitch = async (account) => {
    try {
      const storageVersion = await indexDBUtil.getStorageVersion();
      const useV4 = parseFloat(storageVersion) >= 4.0;

      if (useV4) {
        setSelectedAccount(account);
        setShowNetworkSelector(true);
        setAccountDropdownOpen(false);
      } else {
        const currentPassword = userDetails?.pin;

        if (!currentPassword) {
          toast.error('Session expired. Please login again.');
          return;
        }

        const accountData = await indexDBUtil.validateAndGetAccount(
          account.username,
          currentPassword
        );

        if (!accountData.status) {
          toast.error('Failed to switch account');
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

        setUserDetails({
          ...accountData.data,
          tokenSymbol: networkConfig?.tokenSymbol
        });

        localStorage.setItem(ENUMS.INITIAL_ACTIVE_TIME, JSON.stringify(Date.now()));

        setAccountDropdownOpen(false);
        toast.success(`Switched to ${account.username}`);
      }
    } catch (error) {
      toast.error('Failed to switch account');
    }
  };

  const handleNetworkNodeSelect = async (network, node) => {
    try {
      const currentPassword = userDetails?.pin;

      if (!currentPassword) {
        toast.error('Session expired. Please login again.');
        return;
      }

      const accountData = await indexDBUtil.validateAndGetAccount(
        selectedAccount.username,
        currentPassword
      );

      if (!accountData.status) {
        toast.error('Failed to switch account');
        return;
      }

      const bindings = await indexDBUtil.getAccountNetworkBindings(selectedAccount.username);
      const binding = bindings.find(b => b.networkId === network.id && b.nodeId === node.id);

      if (!binding) {
        await END_POINTS.register_did({ did: accountData.data.did });

        await indexDBUtil.saveAccountNetworkBinding({
          username: selectedAccount.username,
          did: accountData.data.did,
          networkId: network.id,
          nodeId: node.id,
          nodeUrl: node.url,
          swarmKey: network.swarmKey
        });
      }

      const networkConfig = {
        network: network.id,
        RPCUrl: node.url,
        name: network.name,
        tokenSymbol: network.tokenSymbol
      };

      await indexDBUtil.storeNetworkSetting(networkConfig);

      localStorage.setItem("currentUser", JSON.stringify({
        username: accountData.data.username,
        network: network.id
      }));

      await EXECUTE_API({
        data: {
          ...accountData.data,
          tokenSymbol: networkConfig.tokenSymbol
        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });

      setUserDetails({
        ...accountData.data,
        tokenSymbol: networkConfig.tokenSymbol
      });

      localStorage.setItem(ENUMS.INITIAL_ACTIVE_TIME, JSON.stringify(Date.now()));

      setShowNetworkSelector(false);
      setSelectedAccount(null);
      toast.success(`Switched to ${selectedAccount.username} on ${network.name}`);
    } catch (error) {
      toast.error('Failed to switch account: ' + error.message);
    }
  };

  const handleLogoutConfirm = () => {
    setUserDetails({})
    indexDBUtil.storeNetworkSetting("")
    chrome.runtime.sendMessage({ type: WALLET_TYPES.CLEAR_USER_DETAILS })
    navigate('/login', { replace: true });
  };


  return (
    <header className="border-b sticky top-0 left-0 right-0 z-50 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <ContentContainer>
        <div className="py-4 flex items-center justify-between">
          <div className="flex items-center ">
            {/* <img
              src="/images/android-chrome-192x192.png"
              alt="Xell Wallet Logo"
              style={{ width: '50px', height: 'auto' }}
            /> */}
            <NetworkSwitcher />
          </div>

          <div className="flex flex-col items-center relative" ref={accountDropdownRef}>
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{userDetails?.username}</span>
              <FiChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            {accountDropdownOpen && (
              <div className="absolute top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[180px]">
                <div className="p-2 max-h-64 overflow-y-auto">
                  {allAccounts.map((account) => (
                    <div
                      key={account.username}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccountSwitch(account);
                      }}
                      className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                        account.username === userDetails?.username ? 'bg-gray-100 dark:bg-gray-700' : ''
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">@{account.username}</span>
                      {account.username === userDetails?.username && (
                        <span className="ml-auto text-xs text-secondary">✓</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountDropdownOpen(false);
                      navigate('/setup-wallet', { state: { allChecked: true, fromDashboard: true } });
                    }}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">+ Create Wallet</span>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountDropdownOpen(false);
                      navigate('/import-wallet');
                    }}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">+ Import Wallet</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span className="text-sm  text-gray-600 dark:text-gray-300">{userDetails?.did?.slice(0, 5) + '....' + userDetails?.did?.slice(-5)}</span>
              <button onClick={() => handleClickCopy()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <FiCopy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative" ref={dropdownRef}>
              <BsThreeDotsVertical className="w-4 h-4 cursor-pointer" onClick={toggleDropdown} />
            {dropdownOpen && (
              <div className="absolute p-3 right-0 top-8 z-50 bg-white text-gray-900 border rounded shadow-lg">
                <div className="">
                  {dropdownOptions.map((option, index) => (
                    <div key={index} className="flex font-medium text-nowrap cursor-pointer text-sm items-center p-2 rounded-sm hover:bg-gray-200 cursor-pointer " onClick={() => handleOptionClick(option.content)}>
                      {option.icon}
                      {option.label}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutConfirm(true)
                    }}
                    className="px-2 w-full flex items-center  gap-2 text-sm font-medium rounded-sm cursor-pointer hover:bg-gray-200 py-2"
                  >
                    <FiLock className="w-4 h-4" />
                    Lock Xell
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </ContentContainer>
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex w-full items-center justify-center bg-black bg-opacity-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 p-6 w-full rounded-lg shadow-lg  mx-4"
            >
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                Confirm Lock
              </h3>
              <p className="mb-6 text-base text-gray-700 dark:text-gray-300">
                Are you sure you want to lock?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 text-sm py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-secondary rounded "
                >
                  Lock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          {modalContent}
        </Modal>
      )}
      {showNetworkSelector && selectedAccount && (
        <NetworkNodeSelector
          username={selectedAccount.username}
          onSelect={handleNetworkNodeSelect}
          onClose={() => {
            setShowNetworkSelector(false);
            setSelectedAccount(null);
          }}
        />
      )}
    </header>
  );
}