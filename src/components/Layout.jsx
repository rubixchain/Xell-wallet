import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ResizeHandle from './ResizeHandle';

export default function Layout() {
  const [darkMode, setDarkMode] = useState(false);
  const [isSidePanel, setIsSidePanel] = useState(false);

  useEffect(() => {
    // Detect if running in side panel mode
    const checkSidePanelMode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const panelMode = urlParams.get('panel') === 'true';
      const savedSplitMode = localStorage.getItem('walletSplitMode') === 'true';

      setIsSidePanel(panelMode || savedSplitMode);
    };

    checkSidePanelMode();
  }, []);

  return (
    <div
      id="side-panel-content"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        width: isSidePanel ? '32vw' : '100%',
        height: '100%',
        minWidth: isSidePanel ? '320px' : '390px',
        minHeight: isSidePanel ? '100vh' : '600px',
        position: 'relative'
      }}
      className="bg-gray-50 dark:bg-gray-900 transition-colors"
    >
      {isSidePanel && <ResizeHandle />}
      {/* <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} /> */}
      <Outlet />
    </div >
  );
}