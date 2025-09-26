import React, { useEffect, useRef, useState } from 'react';
import { FiXCircle } from 'react-icons/fi';

const Modal = ({ onClose, children, fullWidth = false }) => {
    const modalRef = useRef(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isSplitMode, setIsSplitMode] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setWindowWidth(width);

            // Check if we're in extension context
            const isExtension = window.chrome && chrome.runtime && chrome.runtime.id;

            if (isExtension) {
                // Split mode is when width > 400px (side panel)
                setIsSplitMode(width > 400);
            } else {
                // For regular browser/development
                setIsSplitMode(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Determine modal size based on context
    const isPopupMode = windowWidth <= 400;
    const isMediumScreen = windowWidth >= 640;
    const isLargeScreen = windowWidth >= 1024;
    const isXLScreen = windowWidth >= 1280;

    // Dynamic modal width classes
    const getModalWidthClass = () => {
        if (fullWidth) {
            // For components that need full width (like History)
            if (isPopupMode) return 'max-w-[380px]';
            if (isSplitMode && !isMediumScreen) return 'max-w-[500px]';
            if (isSplitMode && isMediumScreen) return 'max-w-2xl';
            if (isLargeScreen) return 'max-w-4xl';
            if (isXLScreen) return 'max-w-6xl';
            return 'max-w-3xl';
        } else {
            // For regular modals
            if (isPopupMode) return 'max-w-[380px]';
            if (isSplitMode) return 'max-w-lg';
            return 'max-w-md sm:max-w-lg lg:max-w-xl';
        }
    };

    // Dynamic height classes
    const getModalHeightClass = () => {
        if (isPopupMode) return 'h-[85vh]';
        if (isSplitMode) return 'h-[90vh]';
        return 'h-[85vh] sm:h-[90vh]';
    };

    // Dynamic padding classes
    const getPaddingClass = () => {
        if (isPopupMode) return 'p-3';
        if (isSplitMode) return 'p-4 sm:p-6';
        return 'p-4 sm:p-6 lg:p-8';
    };

    return (
        <div className={`
            fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75
            ${isPopupMode ? 'p-2' : 'p-4 sm:p-6 lg:p-8'}
        `}>
            <div
                ref={modalRef}
                className={`
                    bg-white dark:bg-gray-800 rounded-lg relative overflow-hidden
                    w-full transition-all duration-200
                    ${getModalWidthClass()}
                    ${getModalHeightClass()}
                `}
            >
                <div className={`
                    h-full flex flex-col
                    ${getPaddingClass()}
                `}>
                    <button
                        className={`
                            absolute z-10 text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-gray-200
                            transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700
                            ${isPopupMode
                                ? 'top-2 right-2 p-1'
                                : 'top-4 right-4 p-1.5'
                            }
                        `}
                        onClick={onClose}
                    >
                        <FiXCircle className={isPopupMode ? "w-5 h-5" : "w-5 h-5 sm:w-6 sm:h-6"} />
                    </button>

                    {/* Pass responsive context to children */}
                    <div className="h-full overflow-hidden">
                        {React.cloneElement(children, {
                            isModalView: true,
                            isPopupMode,
                            isSplitMode,
                            modalWindowWidth: windowWidth
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal; 