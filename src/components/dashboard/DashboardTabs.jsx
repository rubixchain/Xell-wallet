import { useRef } from 'react';
import { motion } from 'framer-motion';

// Accessible tab bar for the dashboard (FTs | Transaction History).
// Follows the WAI-ARIA tabs pattern: roving tabIndex, arrow-key navigation,
// aria-selected / aria-controls wiring. `tabs` is [{ id, label }].
export default function DashboardTabs({ tabs, activeTab, onChange }) {
  const tabRefs = useRef([]);

  const focusTab = (index) => {
    const next = (index + tabs.length) % tabs.length;
    tabRefs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  const handleKeyDown = (event, index) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(tabs.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex border-b border-gray-200 dark:border-gray-700 mt-8"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            id={`dashboard-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`dashboard-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`relative flex-1 px-4 py-3 text-sm font-semibold text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-lg ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="dashboard-tab-underline"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
