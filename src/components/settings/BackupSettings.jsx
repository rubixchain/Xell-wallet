import { useContext, useState } from 'react';
import { FiDownload, FiRefreshCw, FiArchive, FiEye, FiEyeOff, FiRotateCcw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SettingCard from './SettingCard';
import RecoveryPhraseModal from './backup/RecoveryPhraseModal';
import { UserContext } from '../../context/userContext';
import { END_POINTS } from '../../api/endpoints';
import { generateSignature } from '../../utils';
import indexDBUtil from '../../indexDB';

export default function BackupSettings() {
  const [isRecoveryPhraseModalOpen, setIsRecoveryPhraseModalOpen] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const { userDetails } = useContext(UserContext);

  const onClickTokenRecovery = async () => {
    if (isRecovering) return;
    const did = userDetails?.did;
    if (!did) {
      toast.error('No DID found for this account');
      return;
    }
    setIsRecovering(true);
    try {
      const recovery = await END_POINTS.sync_recovery(did);
      if (!recovery?.status) {
        toast.error('Wallet recovery failed. Please try again.');
        return;
      }

      // Recovery completed without needing a signature.
      if (!recovery?.result?.id || !recovery?.result?.hash) {
        toast.success('Wallet recovery completed successfully');
        return;
      }

      // "Signature needed": sign the returned hash and post it back.
      const getPrivateKey = await indexDBUtil.getData(
        'UserDetails',
        userDetails?.username,
        userDetails?.pin
      );
      const signature = await generateSignature(
        getPrivateKey?.privatekey,
        recovery.result.hash
      );
      const signatureResponse = await END_POINTS.signature_response({
        id: recovery.result.id,
        signature,
      });
      if (!signatureResponse?.status) {
        toast.error('Wallet recovery failed. Please try again.');
        return;
      }
      toast.success('Wallet recovery completed successfully');
    } catch (error) {
      toast.error('Token recovery failed. Please try again.');
    } finally {
      setIsRecovering(false);
    }
  };

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
              className="px-4 bg-secondary text-center font-semibold text-white text-xs py-3 rounded-lg hover:bg-primary-light"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Download
            </motion.button>
          </div>
        </SettingCard>

        {/* Token Recovery */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center ">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiRotateCcw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Token Recovery</h3>
                <p className="text-xs text-gray-500">Recover your wallet tokens</p>
              </div>
            </div>
            <motion.button
              onClick={onClickTokenRecovery}
              disabled={isRecovering}
              className="px-4 bg-secondary text-center font-semibold text-white text-xs py-3 rounded-lg hover:bg-primary-light disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={isRecovering ? {} : { scale: 1.05 }}
              whileTap={isRecovering ? {} : { scale: 0.95 }}
            >
              {isRecovering ? 'Recovering…' : 'Token Recovery'}
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