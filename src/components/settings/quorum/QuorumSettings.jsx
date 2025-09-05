import { useState } from 'react';
import { FiUsers } from 'react-icons/fi';
import { motion } from 'framer-motion';
import SettingCard from '../SettingCard';
import QuorumList from './QuorumList';
import QuorumModal from './QuorumModal';
import QuorumStats from './QuorumStats';
import QuorumGuide from './QuorumGuide';

export default function QuorumSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuorum, setSelectedQuorum] = useState(null);

  const handleEdit = (quorum) => {
    setSelectedQuorum(quorum);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedQuorum(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quorum Management
        </h2>
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiUsers className="w-5 h-5" />
          <span>New Quorum</span>
        </motion.button>
      </div>

      <QuorumGuide />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SettingCard>
            <QuorumList onEdit={handleEdit} />
          </SettingCard>
        </div>
        
        <div className="space-y-6">
          <QuorumStats />
        </div>
      </div>

      <QuorumModal 
        isOpen={isModalOpen}
        onClose={handleClose}
        quorum={selectedQuorum}
      />
    </div>
  );
}