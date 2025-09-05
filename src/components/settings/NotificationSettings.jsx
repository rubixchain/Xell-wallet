import { useState } from 'react';
import { FiBell, FiMail, FiSmartphone, FiAlertCircle } from 'react-icons/fi';
import SettingCard from './SettingCard';

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    transactions: true,
    security: true,
    marketing: false,
    email: true,
    push: true
  });

  const handleToggle = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Notifications
      </h2>

      <div className="space-y-4">
        {/* Transaction Notifications */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiBell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Transaction Alerts</h3>
                <p className="text-sm text-gray-500">Receive alerts for transactions</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.transactions}
                onChange={() => handleToggle('transactions')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </SettingCard>

        {/* Security Alerts */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Security Alerts</h3>
                <p className="text-sm text-gray-500">Important security notifications</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.security}
                onChange={() => handleToggle('security')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </SettingCard>

        {/* Notification Methods */}
        <SettingCard>
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Notification Methods</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FiMail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Email Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={() => handleToggle('email')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FiSmartphone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Push Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={() => handleToggle('push')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  );
}