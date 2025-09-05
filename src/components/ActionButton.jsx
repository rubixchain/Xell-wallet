import { FiDownload, FiPrinter } from 'react-icons/fi';

export default function ActionButton({ icon: Icon, children, ...props }) {
  return (
    <button
      className="flex items-center justify-center space-x-2 w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      {...props}
    >
      <Icon className="w-5 h-5" />
      <span>{children}</span>
    </button>
  );
}

export function DownloadButton(props) {
  return <ActionButton icon={FiDownload} {...props}>Download</ActionButton>;
}

export function PrintButton(props) {
  return <ActionButton icon={FiPrinter} {...props}>Print</ActionButton>;
}