import { motion } from 'framer-motion';
import { FiArrowUpRight, FiArrowDownLeft, FiCopy } from 'react-icons/fi';
import { getTimeAgo, sliceString } from '../../utils/utils';
import { config } from '../../../config';
import { useContext } from 'react';
import { UserContext } from '../../context/userContext';
import toast from 'react-hot-toast';

export default function TransactionItem({
  type,
  Status,
  Amount,
  Epoch,
  SenderDID,
  TransactionID,
  ReceiverDID,
  isSmallScreen = false,
  isSplitMode = false
}) {
  const { userDetails } = useContext(UserContext);

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const onClickTxnId = (id) => {
    let link = ''
    if (userDetails?.network == 1) {
      link = config.RUBIX_MAINNET_TXN_LINK
    }
    else if (userDetails?.network == 2) {
      link = config.RUBIX_TESTNET_TXN_LINK
    }
    else if (userDetails?.network == 3) {
      link = config.TRIE_TESTNET_TXN_LINK
    }
    if (!link) {
      return
    }
    window.open(`${link}${id}`, '_blank')
  }
  return (
    <motion.div
      className={`
        w-full border border-gray-200 dark:border-gray-700 rounded-lg
        bg-white dark:bg-gray-800 transition-colors flex flex-col
        ${isSmallScreen ? 'p-3 gap-2 mb-2' : 'p-4 gap-3 mb-3'}
        ${isSplitMode ? 'hover:shadow-md' : ''}
      `}
      style={{ boxShadow: 'none' }}
    >
      {/* TOP ROW: Left Block vs Right Block */}
      <div className="flex justify-between w-full">
        {/* LEFT: Icon + (Status + Time) */}
        <div className="flex items-start gap-2">
          {/* Icon */}
          <motion.div
            className={`
              rounded-lg flex items-center justify-center
              ${isSmallScreen ? 'p-1.5' : 'p-2'}
              ${!Status ? 'bg-red-100/50' : type === 'Sent' ? 'bg-blue-100/50' : 'bg-green-100/50'}
            `}
          >
            {type === 'Sent' ? (
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className={`rounded-lg ${Status === "Completed" ? 'bg-blue-600' : 'bg-[#8B5CF6]'} p-1`}
              >
                <FiArrowUpRight className={isSmallScreen ? "w-4 h-4 text-white" : "w-5 h-5 text-white"} />
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="rounded-lg bg-[#16B500] p-1"
              >
                <FiArrowDownLeft className={isSmallScreen ? "w-4 h-4 text-white" : "w-5 h-5 text-white"} />
              </motion.div>
            )}
          </motion.div>

          {/* Status + Time vertically stacked */}
          <div className="flex flex-col leading-tight">
            <span className={`
              px-2 py-0.5 rounded font-medium
              ${isSmallScreen ? 'text-xs' : 'text-sm'}
              ${!Status ? 'bg-red-100/50 text-red-600' : 'bg-green-100/50 text-green-600'}
            `}>
              {Status ? "Completed" : "Failed"}
            </span>
            <span className={`
              text-gray-500 dark:text-gray-400
              ${isSmallScreen ? 'text-[10px]' : 'text-xs'}
            `}>
              {getTimeAgo(Epoch)}
            </span>
          </div>
        </div>

        {/* RIGHT: Amount + DID vertically stacked */}
        <div className="flex flex-col items-end leading-tight">
        {((userDetails?.network == 4) && Amount === 0) ? null : (
                <div className={`
                  font-semibold text-gray-900 dark:text-white text-senary
                  ${isSmallScreen ? 'text-base' : 'text-lg sm:text-xl'}
                `}>
                  {Amount} {userDetails?.tokenSymbol}
                </div>
              )}
          <div className={`
            flex items-center gap-1 text-quinary font-medium
            ${isSmallScreen ? 'text-xs' : 'text-sm'}
          `}>
            <span>{sliceString(type === 'Sent' ? ReceiverDID : SenderDID, isSmallScreen ? 3 : 4)}</span>
            <motion.button
              onClick={() => handleCopy(type === 'Sent' ? ReceiverDID : SenderDID)}
              className="p-1 hover:text-gray-700 dark:hover:text-gray-300"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiCopy className={isSmallScreen ? "w-3 h-3" : "w-4 h-4"} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* TXN ID: full width at bottom */}
      <div className={`
        flex items-center font-medium text-gray-500 dark:text-gray-400
        ${isSmallScreen ? 'text-xs' : 'text-sm'}
      `}>
        <span>Txn ID:</span>
        <div className="flex items-center ms-1 flex-shrink-0 overflow-hidden">
          <p
            onClick={() => onClickTxnId(TransactionID)}
            className="text-blue-500 dark:text-blue-400 cursor-pointer underline decoration-1 inline-block whitespace-nowrap overflow-hidden text-ellipsis hover:text-blue-600 dark:hover:text-blue-300"
          >
            {sliceString(TransactionID, isSmallScreen ? 4 : 6)}
          </p>
          <motion.button
            onClick={() => handleCopy(TransactionID)}
            className="ml-1 p-1 hover:text-gray-700 dark:hover:text-gray-300"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <FiCopy className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}