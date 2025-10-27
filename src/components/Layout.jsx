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

        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        alignSelf: 'center',
      }}
    >
      <Outlet />
    </div >
  );
}