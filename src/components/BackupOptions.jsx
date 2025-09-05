import { FiDownload, FiPrinter } from 'react-icons/fi';

export default function BackupOptions({ onDownload, onPrint }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={onDownload}
        className="flex text-quinary text-base font-semibold items-center justify-center space-x-2 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <FiDownload className="w-5 h-5" />
        <span>Download</span>
      </button>
      <button
        onClick={onPrint}
        className="flex items-center text-quinary text-base font-semibold justify-center space-x-2 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <FiPrinter className="w-5 h-5" />
        <span>Print</span>
      </button>
    </div>
  );
}