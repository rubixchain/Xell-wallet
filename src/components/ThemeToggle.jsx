import { useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle({ darkMode, setDarkMode }) {
  useEffect(() => {
    const htmlElement = document.documentElement;

    // Clear existing theme classes
    htmlElement.classList.remove('dark', 'custom-blue');

    // Add the appropriate class based on the theme
    if (darkMode) {
      htmlElement.classList.add('dark');
    }
    // htmlElement.classList.add('custom-red');
    // // if (darkMode) {
    // root.classList.add('dark');
    // root.style.colorScheme = 'blue';
    // // } else {
    // // document.documentElement.classList.remove('dark');
    // // }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {darkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
    </button>
  );
}