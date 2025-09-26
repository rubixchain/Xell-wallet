import { useState, useEffect } from 'react';

export default function ContentContainer({ children, className = '' }) {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [isPopup, setIsPopup] = useState(false);

  useEffect(() => {
    // Check if we're in split mode by checking window width
    // Extension popup is typically 390px, side panel is wider
    const checkMode = () => {
      const width = window.innerWidth;
      // Check if running in extension context
      const isExtension = window.chrome && chrome.runtime && chrome.runtime.id;

      if (isExtension) {
        // Popup mode is typically around 390px, side panel is 400px+
        setIsPopup(width <= 400);
        setIsSplitMode(width > 400);
      } else {
        // For regular browser/development
        setIsPopup(false);
        setIsSplitMode(false);
      }
    };

    checkMode();
    window.addEventListener('resize', checkMode);
    return () => window.removeEventListener('resize', checkMode);
  }, []);

  // For popup mode, maintain fixed width for consistency
  // For split mode and regular browser, use responsive width
  const containerStyles = isPopup
    ? { width: 390 }
    : {};

  return (
    <div
      style={containerStyles}
      className={`
        ${!isPopup ? 'w-full max-w-7xl mx-auto' : ''}
        px-4
        ${isSplitMode ? 'sm:px-6 lg:px-8' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}