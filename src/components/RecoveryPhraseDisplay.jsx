import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function RecoveryPhraseDisplay({ phrase }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <div className={`
        bg-blue-50 dark:bg-gray-900 p-6 rounded-lg font-mono text-lg
        ${isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-transparent select-none'}
        transition-colors
      `}
      style={{ textShadow: isVisible ? 'none' : '0 0 8px rgba(0,0,0,0.5)' }}
      >
        {phrase}
      </div>
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label={isVisible ? 'Hide recovery phrase' : 'Show recovery phrase'}
      >
        {isVisible ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  );
}