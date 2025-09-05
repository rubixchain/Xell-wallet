import { useState } from 'react';
import { FiEye, FiEyeOff, FiCopy, FiInfo, FiHelpCircle, FiDownload } from 'react-icons/fi';

export default function MnemonicDisplay({ phrase, onCopy, handleDownload }) {
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base flex items-center gap-1  font-semibold text-gray-900 dark:text-white">
          Mnemonic Phrase <FiHelpCircle className="w-4 h-4" />
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="flex items-center me-3 space-x-1 text-sm text-quinary font-semibold hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            title="Download mnemonic"
          >
            <FiDownload className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-sm text-quinary font-semibold hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            <FiCopy className="w-4 h-4" />
            {/* <span>{copied ? 'Copied!' : 'Copy'}</span> */}
          </button>

          {/* <button
            onClick={() => setIsVisible(!isVisible)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isVisible ? (
              <>
                <FiEyeOff className="w-4 h-4" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <FiEye className="w-4 h-4" />
                <span>Show</span>
              </>
            )}
          </button> */}
        </div>
      </div>
      <div className={`
        bg-blue-50 dark:bg-gray-900 p-6 rounded-lg font-mono text-lg
        ${isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-transparent select-none'}
        transition-colors
      `}
        style={{ textShadow: isVisible ? 'none' : '0 0 8px rgba(0,0,0,0.5)' }}
      >
        {phrase}
      </div>
    </div>
  );
}