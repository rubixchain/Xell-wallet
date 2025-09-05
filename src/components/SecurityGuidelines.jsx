import { FiShield } from 'react-icons/fi';

export default function SecurityGuidelines() {
  const guidelines = [
    'Never share your recovery phrase with anyone',
    'Store in a secure, offline location',
    'Avoid digital storage methods',
    'Consider using a metal backup for durability',
    'Store copies in multiple secure locations'
  ];

  return (
    <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
      <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200 mb-2">
        <FiShield className="w-5 h-5" />
        <h3 className="font-semibold text-yellow-900 ">Security Guidelines</h3>
      </div>
      <ul className="space-y-2">
        {guidelines.map((guideline, index) => (
          <li key={index} className="flex items-start font-medium space-x-2 text-yellow-900 dark:text-yellow-300">
            <span className="text-sm">•</span>
            <span className="text-sm">{guideline}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}