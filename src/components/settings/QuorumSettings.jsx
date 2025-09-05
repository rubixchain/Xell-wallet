import { useState } from 'react';
import { FiUsers, FiPlus } from 'react-icons/fi';
import { motion } from 'framer-motion';
import SettingCard from './SettingCard';
import QuorumList from './quorum/QuorumList';
import QuorumModal from './quorum/QuorumModal';

export default function QuorumSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Quorum Management
      </h2>

      <SettingCard>
        <div className="space-y-6">
          <div className="sm:flex sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiUsers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Quorum Setup</h3>
                <p className="text-sm text-gray-500">Manage your transaction validators</p>
              </div>
            </div>

            <motion.button
              onClick={() => setIsModalOpen(true)}
              className="flex mt-4 sm:mt-0 items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiPlus className="w-5 h-5" />
              <span>New Quorum</span>
            </motion.button>
          </div>

          <QuorumList />
        </div>
      </SettingCard>

      <QuorumModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}