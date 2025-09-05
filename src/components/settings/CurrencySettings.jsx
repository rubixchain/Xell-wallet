import { useContext, useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiDollarSign } from 'react-icons/fi';
import SettingCard from './SettingCard';
import { AnimatePresence, motion } from 'framer-motion';
import { convertCurrency } from '../../utils';
import { UserContext } from '../../context/userContext';

export default function CurrencySettings() {
  const { currency, setCurrency } = useContext(UserContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const sortOptions = [
    { label: '$ USD - US Dollar', value: 'USD' },
    { label: '€ EUR - Euro', value: 'EUR' },
    { label: '£ GRB - British Pound', value: 'GBP' },
    { label: '¥ JPY - Japanese Yen', value: 'JPY' },
  ];
  const popupRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [])

  useEffect(() => {
    let res = localStorage.getItem('currency')
    if (!res) {
      return
    }
    res = JSON.parse(res)
    setCurrency(res)
  }, [])

  const onChangeCurrency = async (option) => {
    setCurrency(option);
    setIsDropdownOpen(false);
    localStorage.setItem('currency', JSON.stringify(option))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Currency Settings
      </h2>

      <SettingCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-5 h-5 text-primary" />
            </div> */}
            <div>
              <h3 className="font-medium text-sm text-gray-900 dark:text-white">Display Currency</h3>
              <p className="text-xs text-gray-500">Choose your preferred currency</p>
            </div>
          </div>
          <div className="relative mt-4 ms-2 sm:mt-0 " ref={popupRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-3 w-full text-nowrap font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-center items-center space-x-2"
            >
              <span>{currency?.label}</span>
              <FiChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute  right-0 left:0 top-full mt-2  bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onChangeCurrency(option)}
                      className="w-full  font-semibold text-left text-nowrap px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                    >
                      <span className='text-nowrap'>{option.label}</span>
                      {currency === option.label && (
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
    </div>
  );
}