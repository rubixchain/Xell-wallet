import { useState, useRef, useEffect } from "react";
import { FiCalendar } from "react-icons/fi";

function App({ displayedRange, setDisplayedRange }) {
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [tempRange, setTempRange] = useState({
    startDate: new Date("2024-12-02"),
    endDate: new Date()
  });

  useEffect(() => {
    setTempRange(displayedRange);
  }, [displayedRange]);

  const calendarRef = useRef(null);
  const modalRef = useRef(null);

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
        setShowModal(false);
        setTempRange(displayedRange);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [displayedRange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleCloseModal();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleCalendarOpen = () => {
    setTempRange(displayedRange);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleApply = () => {
    setDisplayedRange(tempRange);
    handleCloseModal();
  };

  return (
    <div className="flex items-center h-full">
      <div className="relative" ref={calendarRef}>
        <button
          onClick={handleCalendarOpen}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FiCalendar className="w-5 h-5" />
        </button>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 p-4 w-80">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-senary dark:text-white">Date Range</h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setTempRange(displayedRange);
                    }}
                    className="text-quinary hover:text-senary dark:hover:text-gray-300 p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-quinary dark:text-gray-300">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(tempRange.startDate)}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded text-senary focus:ring-1 focus:ring-secondary focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-quinary dark:text-gray-300">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formatDateForInput(tempRange.endDate)}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                      min={formatDateForInput(tempRange.startDate)}
                      className="w-full px-2 py-1.5 text-sm bg-white border border-gray-200 rounded text-senary focus:ring-1 focus:ring-secondary focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setTempRange(displayedRange);
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-quinary dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 px-3 py-1.5 text-xs bg-secondary text-white rounded hover:bg-primary transition-colors font-semibold"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
    input[type='date']::-webkit-calendar-picker-indicator {
      cursor: pointer;
    }
    input[type='date']::-moz-calendar-picker {
      cursor: pointer;
    }
    input[type='date']::-webkit-clear-button {
      display: none;
    }
    input[type='date']::-moz-clear {
      display: none;
    }
    input[type='date']::-webkit-datetime-edit-fields-wrapper {
      pointer-events: none;
    }
  `}</style>
    </div>

  );
}

export default App;