import { motion } from 'framer-motion';
import { FiArrowUpRight, FiArrowDownLeft, FiCopy } from 'react-icons/fi';
import { useState, useContext } from 'react';
import { UserContext } from '../../context/userContext';
import History from '../../pages/History';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';
import { config } from '../../../config';
import { getTimeAgo, sliceString } from '../../utils/utils';

export default function RecentTransactions({ transactionsData }) {
  const { selectedNetwork, userDetails } = useContext(UserContext)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 }
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard')
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

  const handleViewAll = () => {
    setIsHistoryModalOpen(true);
  };

  return (
    <>
      <motion.div
        className=""
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div className="flex mt-14 items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Transactions
          </h2>
          {transactionsData?.length > 0 && <motion.button
            onClick={handleViewAll}
            className="text-primary bg-[#e5e5e5]/30 rounded-md px-3 py-2 hover:text-primary-light text-sm font-medium pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View all
          </motion.button>}
        </motion.div>
        {!transactionsData?.length ? <div className="text-center">No transactions available</div> : <div className="space-y-4 overflow-auto ">
          {transactionsData?.slice(0, 3)?.map((tx, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="
    w-full p-3 border border-[#E5E7EB] rounded-lg
    hover:bg-gray-50 dark:hover:bg-gray-700
    transition-colors flex flex-col gap-1
  "
            >
              {/* TOP ROW: Left Block vs Right Block */}
              <div className="flex justify-between w-full">
                {/* LEFT: Icon + (Status + Time) */}
                <div className="flex items-start gap-2">
                  {/* Icon */}
                  <motion.div
                    className={`p-2 rounded-lg flex items-center justify-center 
          ${!tx.Status ? 'bg-red-100/50' : tx.type === 'Sent' ? 'bg-blue-100/50' : 'bg-green-100/50'}`}
                  >
                    {tx.type === 'Sent' ? (
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className={`rounded-lg ${tx.Status === "Completed" ? 'bg-blue-600' : 'bg-[#8B5CF6]'} p-1`}
                      >
                        <FiArrowUpRight className="w-5 h-5 text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="rounded-lg bg-[#16B500] p-1"
                      >
                        <FiArrowDownLeft className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Status + Time vertically stacked */}
                  <div className="flex flex-col leading-tight">
                    <span className={`text-[14px] px-2 py-0.5 rounded 
          ${!tx.Status ? 'bg-red-100/50 text-red-600' : 'bg-green-100/50 text-green-600'}`}>
                      {tx.Status ? "Completed" : "Failed"}
                    </span>
                    <span className="text-[12px] text-gray-500">
                      {getTimeAgo(tx.Epoch)}
                    </span>
                  </div>
                </div>

                {/* RIGHT: Amount + DID vertically stacked */}
                <div className="flex flex-col items-end leading-tight">
                {((userDetails?.network == 4) && tx.Amount === 0) ? null : (
                <div className="font-semibold text-gray-900 dark:text-white text-xl text-senary">
                  {tx.Amount} {userDetails?.tokenSymbol}
                </div>
              )}
                  <div className="flex items-center gap-1 text-[14px] text-quinary font-medium">
                    <span>{sliceString(tx.type === 'Sent' ? tx?.ReceiverDID : tx.SenderDID, 4)}</span>
                    <motion.button
                      onClick={() => handleCopy(tx.type === 'Sent' ? tx?.ReceiverDID : tx.SenderDID)}
                      className="p-1 hover:text-gray-700 dark:hover:text-gray-300"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiCopy className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* TXN ID: full width at bottom */}
              <div className="flex items-center flex-wrap text-[14px] font-medium text-gray-500">
                Txn ID:
                <p
                  onClick={() => onClickTxnId(tx.TransactionID)}
                  className="underline ms-1 text-blue-500 cursor-pointer truncate"
                >
                  {sliceString(tx.TransactionID, 6)}
                </p>
                <motion.button
                  onClick={() => handleCopy(tx.TransactionID)}
                  className="p-1 hover:text-gray-700 dark:hover:text-gray-300"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiCopy className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>}
      </motion.div>
      {isHistoryModalOpen && (
        <Modal onClose={() => setIsHistoryModalOpen(false)}>
          <History isModal={true} />
        </Modal>
      )}
    </>
  );
}