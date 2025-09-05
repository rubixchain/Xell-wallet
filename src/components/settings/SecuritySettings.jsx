import { useContext, useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiEye, FiShieldOff, FiLogOut } from 'react-icons/fi';
import SettingCard from './SettingCard';
import PinSettings from './security/PinSettings';
import { AnimatePresence, motion } from 'framer-motion';
import { UserContext } from '../../context/userContext';
import { useNavigate } from 'react-router-dom';


export default function SecuritySettings() {
  const { setAutoLockTime, autoLockTime, setUserDetails } = useContext(UserContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const sortOptions = [
    { label: 0, value: 0 },
    { label: 1, value: 1 },
    { label: 2, value: 2 },
    { label: 3, value: 3 },
    { label: 4, value: 4 },
    { label: 5, value: 5 }
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onClickChangeTimer = (value) => {
    localStorage.setItem("logginTimeOut", JSON.stringify(value));
    setAutoLockTime(value);
    setIsDropdownOpen(false);
  };

  const handleLogoutConfirm = () => {
    // Optionally clear authentication tokens or context here
    setUserDetails({})
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6 bg-white w-full">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Security & Privacy
      </h2>

      <div className="space-y-6">
        {/* Auto-Lock */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiEye className="w-5 h-5 text-primary" />

              <div className="ms-2">
                <h3 className="font-medium text-sm text-senary dark:text-white">
                  Auto-Lock (In Minutes)
                </h3>
                <p className="text-xs text-quinary">Lock wallet after inactivity</p>
              </div>
            </div>
            <div className="relative mt-4 sm:mt-0" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="px-4 py-3 w-full font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-center items-center space-x-2"
              >
                <span>{autoLockTime}</span>
                <FiChevronDown
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 left-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                  >
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onClickChangeTimer(option.label)}
                        className="w-full font-semibold text-left whitespace-nowrap px-4 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                      >
                        <span>{option.label}</span>
                        {autoLockTime === option.label && (
                          <FiCheck className="text-primary ms-12 h-4" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SettingCard>

        {/* PIN Management */}
        <SettingCard>
          <PinSettings />
        </SettingCard>

      </div>
    </div>
  );
}
