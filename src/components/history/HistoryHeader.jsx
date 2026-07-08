import { useState, useRef, useEffect } from "react";
import { FiCalendar, FiDownload } from "react-icons/fi";


function App({ displayedRange, setDisplayedRange, onDownload, hasTransactions }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [tempRange, setTempRange] = useState({
    startDate: new Date("2024-12-02"),
    endDate: new Date("2025-02-21")
  });

  const calendarRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setTempRange(displayedRange);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [displayedRange]);

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (type, value) => {
    if (!value) {
      return
    }
    setTempRange(prev => ({
      ...prev,
      [type]: new Date(value)
    }));
  };

  const handleApply = () => {
    setDisplayedRange(tempRange);
    setShowDatePicker(false);
  };

  const handleCalendarOpen = () => {
    setTempRange(displayedRange);
    setShowDatePicker(true);
  };

  return (
    <div className="">

      <div className="flex pb-3 border-b-2 flex-row items-start sm:items-center justify-between relative w-full gap-4 sm:gap-0">
        <h1 className="text-[22px] font-bold text-senary dark:text-white">
          History
        </h1>
        <div className="flex items-center gap-2">
        <button
          onClick={onDownload}
          disabled={!hasTransactions}
          title="Download transaction history (CSV)"
          className="flex font-semibold items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiDownload className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Download</span>
        </button>
        <div className="relative w-auto" ref={calendarRef}>
          <button
            className="flex font-semibold items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={handleCalendarOpen}
          >
            <FiCalendar className="w-5 h-5" />
            <span className="text-sm">
              {formatDate(displayedRange.startDate)} - {formatDate(displayedRange.endDate)}
            </span>
          </button>

          {showDatePicker && (
            <div className="absolute right-0 mt-2 z-50 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <div className={`flex flex-col space-y-4 ${isMobile ? "scale-95" : ""}`}>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(tempRange.startDate)}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  // className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(tempRange.endDate)}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    min={formatDateForInput(tempRange.startDate)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"

                  // className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDatePicker(false);
                      setTempRange(displayedRange);
                    }}
                    className="mt-2 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="mt-2 w-full px-4 py-2 bg-primary dark:bg-blue-500 text-white rounded-lg dark:hover:bg-blue-600 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      <style jsx>{`
                input[type='date']::-webkit-calendar-picker-indicator {
                    cursor: pointer; /* Change cursor style */
                }
                input[type='date']::-moz-calendar-picker {
                    cursor: pointer; /* Change cursor style for Firefox */
                }
                /* Hide the clear button in WebKit browsers (Chrome, Safari) */
                input[type="date"]::-webkit-clear-button {
                    display: none;
                }
                /* Hide the clear button in Firefox */
                input[type="date"]::-moz-clear {
                    display: none;
                }
                     input[type="date"]::-webkit-datetime-edit-fields-wrapper {
          pointer-events: none;
        }
            `}</style>
    </div>
  );
}

export default App;