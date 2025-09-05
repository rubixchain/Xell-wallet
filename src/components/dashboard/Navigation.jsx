import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiPieChart, FiClock, FiSettings, FiGlobe } from 'react-icons/fi';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { icon: FiHome, label: 'Dashboard', path: '/dashboard' },
    // { icon: FiPieChart, label: 'Assets', path: '/assets' },
    { icon: FiClock, label: 'History', path: '/history' },
    { icon: FiGlobe, label: 'Add Network', path: '/add-network' },
    { icon: FiSettings, label: 'Settings', path: '/settings' }
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          {items.map(({ icon: Icon, label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`flex flex-col bg-light items-center space-y-1 py-3 rounded-xl ${location.pathname === path
                ? 'text-primary bg-[#E5E5E540]'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}