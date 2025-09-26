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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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
    { icon: <FiShield />, label: 'Security & Privacy', content: <SecuritySettings /> },
    { icon: <FiGlobe />, label: 'Chain Connect', content: <NetworkSettings /> },
    { icon: <FiKey />, label: 'Backup & Recovery', content: <BackupSettings /> },
    { icon: <FiDollarSign />, label: 'Currency', content: <CurrencySettings /> },
    { icon: <FiClock />, label: 'History', content: <History isModal={true} /> }
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

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPopupMode = windowWidth <= 400;
  const isMediumScreen = windowWidth >= 640;
  const isLargeScreen = windowWidth >= 1024;

  const handleLogoutConfirm = () => {
    setUserDetails({})
    indexDBUtil.storeNetworkSetting("")
    chrome.runtime.sendMessage({ type: WALLET_TYPES.CLEAR_USER_DETAILS })
    navigate('/login', { replace: true });
  };


  return (
    <header className="border-b sticky top-0 left-0 right-0 z-50 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <ContentContainer>
        <div className={`
          py-3 flex items-center justify-between gap-2
          ${isPopupMode ? 'px-3' : 'px-4 sm:px-6 lg:px-8'}
        `}>
          <div className="flex items-center flex-shrink-0">
            <NetworkSwitcher />
          </div>

          <div className={`
            flex flex-col items-center flex-grow min-w-0
            ${!isPopupMode ? 'sm:flex-row sm:gap-2' : ''}
          `}>
            <span className={`
              font-bold text-gray-600 dark:text-gray-300 truncate
              ${isPopupMode ? 'text-sm' : 'text-sm sm:text-base'}
              ${!isPopupMode ? 'max-w-xs lg:max-w-md' : ''}
            `}>
              {userDetails?.username}
            </span>
            <div className="flex items-center space-x-1">
              <span className={`
                text-gray-600 dark:text-gray-300
                ${isPopupMode ? 'text-xs' : 'text-xs sm:text-sm'}
              `}>
                {isPopupMode || !isMediumScreen
                  ? userDetails?.did?.slice(0, 5) + '....' + userDetails?.did?.slice(-5)
                  : userDetails?.did?.slice(0, 10) + '....' + userDetails?.did?.slice(-10)
                }
              </span>
              <button
                onClick={() => handleClickCopy()}
                className={`
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors
                  ${isPopupMode ? 'p-1' : 'p-1.5'}
                `}
              >
                <FiCopy className={isPopupMode ? "w-3 h-3" : "w-3 h-3 sm:w-4 sm:h-4"} />
              </button>
            </div>
          </div>

          <div className={`
            flex items-center flex-shrink-0
            ${isPopupMode ? 'space-x-1' : 'space-x-2'}
          `}>
            {/* Split Button */}
            <button
              onClick={toggleSplitMode}
              className={`
                hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors
                ${isPopupMode ? 'p-2' : 'p-2 sm:p-2.5'}
                ${
                  isSplitMode
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300'
                }
              `}
              title={isSplitMode ? 'Exit Split Mode' : 'Enter Split Mode'}
            >
              <FiColumns className={isPopupMode ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5"} />
            </button>

            {/* Settings Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className={`
                  hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300
                  ${isPopupMode ? 'p-2' : 'p-2 sm:p-2.5'}
                `}
              >
                <BsThreeDotsVertical className={isPopupMode ? "w-4 h-4" : "w-4 h-4 sm:w-5 sm:h-5"} />
              </button>
              {dropdownOpen && (
              <div className={`
                absolute right-0 z-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl
                ${isPopupMode ? 'top-8 p-3 min-w-[200px]' : 'top-10 p-3 min-w-[200px] sm:min-w-[240px]'}
                ${!isPopupMode && windowWidth > 768 ? 'right-0' : 'right-0'}
              `}>
                <div className="">
                  {dropdownOptions.map((option, index) => (
                    <div
                      key={index}
                      className={`
                        flex items-center rounded-sm transition-colors
                        hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
                        ${isPopupMode
                          ? 'text-sm font-medium p-2 gap-2 whitespace-nowrap'
                          : 'text-sm font-medium p-2.5 gap-3 sm:text-base'
                        }
                        ${!isPopupMode && !isMediumScreen ? 'whitespace-nowrap' : ''}
                      `}
                      onClick={() => handleOptionClick(option.content)}
                    >
                      <span className="flex-shrink-0">
                        {option.icon}
                      </span>
                      <span>
                        {option.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutConfirm(true)
                    }}
                    className={`
                      w-full flex items-center rounded-sm transition-colors
                      hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer
                      ${isPopupMode
                        ? 'text-sm font-medium p-2 gap-2'
                        : 'text-sm font-medium p-2.5 gap-3 sm:text-base'
                      }
                    `}
                  >
                    <FiLock className="w-4 h-4 flex-shrink-0" />
                    <span>Lock Xell</span>
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
              className={`
                bg-white dark:bg-gray-800 rounded-lg shadow-lg
                ${isPopupMode
                  ? 'p-4 mx-4 max-w-sm'
                  : 'p-6 mx-4 sm:mx-auto sm:max-w-md lg:max-w-lg'
                }
              `}
            >
              <h3 className={`
                font-bold mb-4 text-gray-900 dark:text-white
                ${isPopupMode ? 'text-base' : 'text-lg sm:text-xl'}
              `}>
                Confirm Lock
              </h3>
              <p className={`
                mb-6 text-gray-700 dark:text-gray-300
                ${isPopupMode ? 'text-sm' : 'text-base'}
              `}>
                Are you sure you want to lock?
              </p>
              <div className={`
                flex justify-end
                ${isPopupMode ? 'space-x-2' : 'space-x-4'}
              `}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`
                    font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700
                    rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                    ${isPopupMode ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm sm:text-base'}
                  `}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className={`
                    font-medium text-white bg-secondary rounded-md hover:bg-opacity-90 transition-colors
                    ${isPopupMode ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm sm:text-base'}
                  `}
                >
                  Lock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} fullWidth={true}>
          {modalContent}
        </Modal>
      )}
    </header>
  );
}