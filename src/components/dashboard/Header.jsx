import { FiCopy, FiShield, FiGlobe, FiKey, FiDollarSign, FiLogOut, FiClock, FiColumns } from 'react-icons/fi';
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

export default function Header() {
  const { userDetails, setUserDetails } = useContext(UserContext);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleClickCopy = () => {
    navigator.clipboard.writeText(userDetails?.did);
    toast.success("Copied to clipboard");
  };

  const toggleSplitMode = async () => {
    try {
      const newSplitMode = !isSplitMode;
      setIsSplitMode(newSplitMode);

      // Don't store preference - always start fresh as popup

      if (newSplitMode) {
        // Enable side panel mode - open side panel directly from user gesture
        if (chrome?.sidePanel) {
          // DON'T change the panel behavior - keep extension icon as popup
          // Just open the side panel manually
          const currentWindow = await chrome.windows.getCurrent();
          await chrome.sidePanel.open({ windowId: currentWindow.id });

          // Close the current popup window
          window.close();
        }
        toast.success('Split mode enabled');
      } else {
        // Disable side panel mode - close side panel if open
        if (chrome?.sidePanel) {
          try {
            // Close the side panel by getting current window
            const currentWindow = await chrome.windows.getCurrent();
            // Note: There's no direct close method, but changing behavior should work
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
          } catch (error) {
            console.log('Side panel already closed or not available');
          }
        }
        toast.success('Split mode disabled - Extension icon will open popup');
      }

      // Don't store split mode preference - let it reset each time
      // This ensures extension always opens as popup by default

    } catch (error) {
      console.error('Error toggling split mode:', error);
      toast.error('Unable to toggle split mode');
    }
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Always start in popup mode (no persistence of split mode)
  useEffect(() => {
    const initializeMode = async () => {
      // Always start as popup mode
      setIsSplitMode(false);

      // ALWAYS ensure extension icon opens popup, never side panel
      if (chrome?.sidePanel?.setPanelBehavior) {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
      }

      // Clear any old split mode preferences
      localStorage.removeItem('walletSplitMode');

      // Also clear chrome storage
      if (chrome?.storage?.local) {
        await chrome.storage.local.remove(['splitMode']);
      }
    };

    initializeMode();
  }, []);

  const handleLogoutConfirm = () => {
    setUserDetails({})
    indexDBUtil.storeNetworkSetting("")
    chrome.runtime.sendMessage({ type: WALLET_TYPES.CLEAR_USER_DETAILS })
    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b sticky top-0 left-0 right-0 z-50 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <ContentContainer>
        <div className="py-3 px-3 flex items-center justify-between gap-2">
          <div className="flex items-center flex-shrink-0">
            <NetworkSwitcher />
          </div>

          <div className="flex flex-col items-center flex-grow min-w-0">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-300 truncate">{userDetails?.username}</span>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600 dark:text-gray-300">{userDetails?.did?.slice(0, 5) + '....' + userDetails?.did?.slice(-5)}</span>
              <button onClick={() => handleClickCopy()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <FiCopy className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Split Button */}
            <button
              onClick={toggleSplitMode}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                isSplitMode
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
              title={isSplitMode ? 'Exit Split Mode' : 'Enter Split Mode'}
            >
              <FiColumns className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
              >
                <BsThreeDotsVertical className="w-4 h-4" />
              </button>
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
                    Lock Wallet
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
    </header>
  );
}