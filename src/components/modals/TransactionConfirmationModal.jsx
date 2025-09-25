import { useContext } from 'react';
import { FiArrowLeft, FiCheck, FiCopy, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Button from '../Button';
import { UserContext } from '../../context/userContext';
import toast from 'react-hot-toast';

export default function TransactionConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onReject,
  transactionData,
  isLoading = false 
}) {
  const { userDetails } = useContext(UserContext);

  if (!isOpen) return null;

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onReject();
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    if (address.length <= 20) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const getTokenSymbol = () => {
    if (userDetails?.network == 1 || userDetails?.network == 2) {
      return 'RBT';
    }
    return userDetails?.tokenSymbol || 'Token';
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getSenderAddress = () => {
    return userDetails?.did || userDetails?.address || 'Unknown';
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClickOutside}
    >
      <motion.div
        className="overflow-auto w-full max-w-md max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onMouseDown={(e) => e?.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center space-x-4 z-100 border-b-2 pb-3">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-senary dark:text-white">
            Review
          </h2>
        </div>

        {/* Transaction Amount */}
        <div className="space-y-2 bg-[#E5E5E540] p-3 rounded-lg">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Transaction Amount
          </label>
          <div className="text-center py-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {transactionData?.amount} {getTokenSymbol()}
            </span>
          </div>
        </div>

        {/* From and To Section */}
        <div className="space-y-4">
          {/* From Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              From
            </label>
            <div className="flex items-center space-x-3 p-3 bg-[#E5E5E540] rounded-lg">
              {/* Address */}
              <div className="flex-1">
                <p className="text-sm font-mono text-gray-900 dark:text-white">
                  {formatAddress(getSenderAddress())}
                </p>
              </div>
              {/* Copy Icon */}
              <button
                onClick={() => copyToClipboard(getSenderAddress(), 'Sender address')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FiCopy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <FiArrowRight className="w-5 h-5 text-gray-400" />
          </div>

          {/* To Section */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              To
            </label>
            <div className="flex items-center space-x-3 p-3 bg-[#E5E5E540] rounded-lg">
              {/* Address */}
              <div className="flex-1">
                <p className="text-sm font-mono text-gray-900 dark:text-white">
                  {formatAddress(transactionData?.recipientAddress)}
                </p>
              </div>
              {/* Copy Icon */}
              <button
                onClick={() => copyToClipboard(transactionData?.recipientAddress, 'Recipient address')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FiCopy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Comments */}
          {transactionData?.comments && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                Comments
              </label>
              <div className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-sm text-gray-900 dark:text-white">
                  {transactionData.comments}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex w-full justify-between pb-6">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="text-gray-900 border w-[45%] text-base border-secondary font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="text-white bg-secondary w-[45%] text-base font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex justify-center items-center">
                <div className="loader border-t-transparent text-sm border-solid border-2 border-white-500 rounded-full animate-spin w-6 h-6"></div>
              </div>
            ) : (
              <>
                <FiCheck className="w-5 h-5" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
