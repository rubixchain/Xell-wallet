import { FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function QuorumGuide() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
    >
      <div className="flex items-start space-x-3">
        <div className="p-1">
          <FiInfo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-medium text-blue-900 dark:text-blue-200">
            About Quorum Management
          </h3>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            A quorum is a group of validators that must reach consensus to approve transactions. 
            Multiple quorums provide redundancy and increased security for your wallet.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">• Minimum validators:</span> 3
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">• Maximum validators:</span> 7
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">• Required consensus:</span> 66%
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">• Max quorums:</span> 3
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}