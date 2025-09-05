import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        display: 'flex',
        // flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        alignSelf: 'center',
      }}
    // className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors"
    >
      {/* <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} /> */}
      <Outlet />
    </div >
  );
}