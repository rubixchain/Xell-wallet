import React, { useEffect, useRef, useState } from 'react';
import { FiSearch, FiChevronDown, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryFilters({ selectedType, setSelectedType, inputValue, setInputValue }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Reference for the calendar dropdown

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const typeOptions = [
    { label: 'All', value: 'all' },
    { label: 'Sent', value: 'Sent' },
    { label: 'Received', value: 'received' }
  ];

  return (
    <div className="flex flex-wrap sm:space-x-4 relative">
      {/* Search Input */}
      <div className="sm:flex-1 font-semibold w-[100%] sm:w-[80%] relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e?.target.value)}
          placeholder="Search by address or transaction ID..."
          className="w-full pl-10 pr-4 py-3  bg-[#E5E5E540]  dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Type Dropdown */}
      <div className="relative  font-semibold   mt-4 sm:mt-0 w-[40%] sm:w-[20%]" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-4 py-3 text-right bg-white w-full dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-center items-center space-x-2"
        >
          <span className="dark:text-white">{selectedType}</span>
          <FiChevronDown
            className={`w-4 h-4 dark:text-white  transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 sm:right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
            >
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedType(option.label);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <span className="dark:text-white">{option.label}</span>
                  {selectedType === option.label && (
                    <FiCheck className="text-primary dark:text-white w-4 h-4" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}