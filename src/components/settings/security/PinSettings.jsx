import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { motion } from 'framer-motion';
import ChangePinModal from './ChangePinModal';

export default function PinSettings() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center ">
          <FiLock className="w-5 h-5 text-primary" />
          <div className="ms-2">
            <h3 className="font-medium text-sm text-senary dark:text-white">Change PIN</h3>
            <p className="text-xs text-quinary">Update your wallet access PIN</p>
          </div>
        </div>
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-secondary text-white font-medium text-xs  rounded-lg hover:bg-primary-light"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Change PIN
        </motion.button>
      </div>

      <ChangePinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}