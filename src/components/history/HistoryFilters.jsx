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

    <div className="flex flex-grow items-center border border-gray-200 rounded-lg relative">
      {/* 🔍 Search icon */}
      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

      {/* Input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search by address..."
        className="w-full pl-10 pr-4 py-2 focus:outline-none"
      />

      {/* Type Dropdown */}
      <div className="relative border-l border-gray-200 h-full" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="h-full px-4 flex items-center text-xs bg-white dark:bg-gray-800"
        >
          <span className="dark:text-white">{selectedType}</span>
          <FiChevronDown
            className={`w-4 h-4 ml-2 dark:text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
            >
              {typeOptions.map(option => (
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