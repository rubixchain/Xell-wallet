import { useState } from 'react';
import { FiDownload, FiRefreshCw, FiArchive, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import SettingCard from './SettingCard';
import RecoveryPhraseModal from './backup/RecoveryPhraseModal';

export default function BackupSettings() {
  const [isRecoveryPhraseModalOpen, setIsRecoveryPhraseModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Backup & Recovery
      </h2>

      <div className="space-y-4">
        {/* Recovery Phrase */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center ">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiArchive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Mnemonics</h3>
                <p className="text-xs text-gray-500">Download Mnemonics</p>
              </div>
            </div>
            <motion.button
              onClick={() => setIsRecoveryPhraseModalOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs py-3 rounded-lg hover:bg-primary-light"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Download
            </motion.button>
          </div>
        </SettingCard>

        {/* Export Wallet */}
        {/* <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiDownload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Export Wallet</h3>
                <p className="text-sm text-gray-500">Download encrypted wallet backup</p>
              </div>
            </div>
            <motion.button
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Export
            </motion.button>
          </div>
        </SettingCard> */}

        {/* Auto Backup */}
        {/* <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiRefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Auto Backup</h3>
                <p className="text-sm text-gray-500">Configure automatic backup settings</p>
              </div>
            </div>
            <motion.button
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Configure
            </motion.button>
          </div>
        </SettingCard> */}
      </div>

      <RecoveryPhraseModal
        isOpen={isRecoveryPhraseModalOpen}
        onClose={() => setIsRecoveryPhraseModalOpen(false)}
      />
    </div>
  );
}