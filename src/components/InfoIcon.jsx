import { FiHelpCircle } from 'react-icons/fi';

export default function InfoIcon({ className = '' }) {
  return (
    <FiHelpCircle 
      className={`text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors ${className}`}
    />
  );
}