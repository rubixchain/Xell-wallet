import { useState } from 'react';
import { FiMoon } from 'react-icons/fi';
import SettingCard from './SettingCard';

export default function AppearanceSettings() {
  const [theme, setTheme] = useState('Light');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Appearance
      </h2>
      
      <SettingCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Theme</h3>
              <p className="text-sm text-gray-500">Select your preferred theme</p>
            </div>
          </div>
          
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Light</option>
            <option>Dark</option>
            <option>System</option>
          </select>
        </div>
      </SettingCard>
    </div>
  );
}