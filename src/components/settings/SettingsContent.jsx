import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiLock, FiGlobe, FiMoon, FiUsers, FiKey, FiBell, FiDollarSign, FiMenu, FiX } from 'react-icons/fi';
import AppearanceSettings from './AppearanceSettings';
import NetworkSettings from './NetworkSettings';
import QuorumSettings from './QuorumSettings';
import SecuritySettings from './SecuritySettings';
import BackupSettings from './BackupSettings';
import NotificationSettings from './NotificationSettings';
import CurrencySettings from './CurrencySettings';

export default function SettingsContent() {
  const [activeSection, setActiveSection] = useState('security');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sections = [
    { id: 'security', icon: FiShield, label: 'Security & Privacy', component: SecuritySettings },
    { id: 'network', icon: FiGlobe, label: 'Chain Connect', component: NetworkSettings },
    // { id: 'quorum', icon: FiUsers, label: 'Quorum', component: QuorumSettings },
    { id: 'backup', icon: FiKey, label: 'Backup & Recovery', component: BackupSettings },
    // { id: 'notifications', icon: FiBell, label: 'Notifications', component: NotificationSettings },
    // { id: 'appearance', icon: FiMoon, label: 'Appearance', component: AppearanceSettings },
    { id: 'currency', icon: FiDollarSign, label: 'Currency', component: CurrencySettings },

  ]

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || SecuritySettings;


  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const NavigationList = () => (
    <nav className="">
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => handleSectionClick(section.id)}
          className={`
            w-full flex items-center space-x-3 text-xs px-4 py-3 mb-2  rounded-lg text-left transition-colors
            ${activeSection === section.id
              ? 'bg-primary text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
          `}
        >
          <section.icon className="w-8 h-5" />
          <span className="font-medium">{section.label}</span>
        </button>
      ))}
    </nav>
  )
  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    if (isMobile) {
      setIsMenuOpen(false);
    }
  };


  return (
    <div className="sm:grid sm:grid-cols-12 gap-6">

      <div className="sm:hidden  z-20  dark:bg-gray-900  dark:border-gray-800 ">
        <div className="flex w-full justify-end mb-2 ">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <FiMenu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {isMobile && (
        <div
          className={`fixed inset-0 z-30 transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Content */}
          <div className="absolute top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <NavigationList />
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="hidden sm:block col-span-3">
        <NavigationList />
      </div>

      {/* Main Content */}
      <div className="col-span-9 mt-4">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ActiveComponent />
        </motion.div>
      </div>
    </div>
  );
}