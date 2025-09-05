import { useState } from 'react';
import { FiEye, FiEyeOff, FiCopy, FiLink } from 'react-icons/fi';
import InfoIcon from './InfoIcon';

export default function MnemonicDisplay({ phrase, onCopy }) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Mnemonic Phrase
          </h2>
          <InfoIcon />
        </div>
      </div>

      <div className="relative">
        <div 
          className={`
            bg-blue-50 dark:bg-gray-900 p-6 rounded-lg font-mono text-lg
            ${isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-transparent select-none'}
            transition-colors
          `}
          style={{ textShadow: isVisible ? 'none' : '0 0 8px rgba(0,0,0,0.5)' }}
        >
          {phrase}
        </div>
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <FiCopy className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {isVisible ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}