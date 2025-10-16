import { useContext, useState, useEffect } from 'react';
import { FiArrowLeft, FiCheck, FiCopy, FiArrowRight, FiEdit2 } from 'react-icons/fi';
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
  isLoading = false,
  onAmountChange
}) {
  const { userDetails } = useContext(UserContext);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [editedAmount, setEditedAmount] = useState('');

  // Update editedAmount when transactionData changes
  useEffect(() => {
    if (transactionData?.amount) {
      setEditedAmount(transactionData.amount);
    }
  }, [transactionData?.amount]);

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

  const handleAmountEdit = () => {
    setIsEditingAmount(true);
  };

  const handleAmountSave = () => {
    if (!editedAmount || parseFloat(editedAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setIsEditingAmount(false);
    toast.success('Amount updated');
    // Notify parent component about the amount change
    if (onAmountChange) {
      onAmountChange(editedAmount);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditedAmount(value);
    }
  };

  const handleConfirm = () => {
    onConfirm({ ...transactionData, amount: editedAmount });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClickOutside}
    >
      <motion.div
        className="w-full max-w-md max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl flex flex-col"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onMouseDown={(e) => e?.stopPropagation()}
      >
        {/* Scrollable Content */}
        <div className="overflow-auto flex-1 p-6">
          {/* Header */}
          <div className="flex items-center space-x-4 border-b-2 pb-3 mb-6">
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

          {/* Transaction Details Group */}
          <div className="space-y-4">
            {/* Transaction Amount */}
            <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Transaction Amount
            </label>
            {!isEditingAmount && (
              <button
                onClick={handleAmountEdit}
                disabled={isLoading}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                <FiEdit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {isEditingAmount ? (
            <div className="flex items-center space-x-2 p-3 bg-[#E5E5E540] rounded-lg">
              <input
                type="text"
                value={editedAmount}
                onChange={handleAmountChange}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary"
                placeholder="Enter amount"
                autoFocus
              />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {getTokenSymbol()}
              </span>
              <button
                onClick={handleAmountSave}
                className="bg-secondary text-white px-3 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
              >
                <FiCheck className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-[#E5E5E540] rounded-lg">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {editedAmount}
              </span>
              <div className="flex items-center space-x-3">
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getTokenSymbol()}
                </span>
              </div>
            </div>
          )}
            </div>

            {/* From and To Section */}
            <div className="space-y-2">
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
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex w-full justify-between gap-4">
            <button
              onClick={onReject}
              disabled={isLoading}
              className="text-gray-900 border flex-1 text-base border-secondary font-bold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="text-white bg-secondary flex-1 text-base font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </motion.div>
    </div>
  );
}
