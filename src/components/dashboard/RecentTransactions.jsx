import { motion } from 'framer-motion';
import { FiArrowUpRight, FiArrowDownLeft, FiCopy } from 'react-icons/fi';
import { getTimeAgo, sliceString } from '../../utils/utils';
import { buildTxnExplorerUrl } from '../../utils/network';
import { TransactionAmount, TransactionAssets } from '../TransactionAmount';
import { useContext, useState } from 'react';
import { UserContext } from '../../context/userContext';
import History from '../../pages/History';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';

export default function RecentTransactions({ transactionsData }) {
  const { userDetails } = useContext(UserContext)
  const [expandedTxns, setExpandedTxns] = useState({})
  const toggleExpanded = (id) => setExpandedTxns((prev) => ({ ...prev, [id]: !prev[id] }))
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

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
    const finalUrl = buildTxnExplorerUrl(userDetails?.network, id);
    if (!finalUrl) return;
    window.open(finalUrl, '_blank')
  }

  return (
    <>
    <motion.div
      className=""
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
          Recent
        </h2>
        {transactionsData?.length > 0 && <motion.button
          onClick={() => setIsHistoryModalOpen(true)}
          className="text-primary bg-[#e5e5e5]/30 rounded-md px-3 py-2 hover:text-primary-light text-sm font-medium pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View all
        </motion.button>}
      </motion.div>

      {!transactionsData?.length ? <div className="text-center text-sm text-gray-500">No transactions available</div> : <div className="space-y-4 overflow-auto ">
        {transactionsData?.slice(0, 3)?.map((tx, index) => {
          const txId = tx.TransactionID || index
          const isExpanded = !!expandedTxns[txId]
          return (
          <motion.div
            key={index}
            variants={itemVariants}
            className="w-full p-3 border border-[#E5E7EB] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex flex-col gap-1"
          >
            {/* TOP ROW: Left Block vs Right Block */}
            <div className="flex justify-between w-full">
              {/* LEFT: Icon + (Status + Time) */}
              <div className="flex items-start gap-2">
                <motion.div
                  className={`p-2 rounded-lg flex items-center justify-center ${!tx.Status ? 'bg-red-100/50' : tx.type === 'Sent' ? 'bg-primary-soft' : 'bg-emerald-100/50'}`}
                >
                  {tx.type === 'Sent' ? (
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="rounded-lg bg-primary p-1"
                    >
                      <FiArrowUpRight className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="rounded-lg bg-emerald-600 p-1"
                    >
                      <FiArrowDownLeft className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Status + Time vertically stacked */}
                <div className="flex flex-col leading-tight">
                  <span className={`text-[14px] px-2 py-0.5 rounded ${!tx.Status ? 'bg-red-100/50 text-red-600' : 'bg-green-100/50 text-green-600'}`}>
                    {tx.Status ? "Success" : "Failed"}
                  </span>
                  <span className="text-[12px] text-gray-500">
                    {getTimeAgo(tx.Epoch, tx.DateTime)}
                  </span>
                </div>
              </div>

              {/* RIGHT: Amount (single, or "first + more" expandable) + DID */}
              <div className="flex flex-col items-end leading-tight">
                <TransactionAmount
                  assets={tx.Assets}
                  amount={tx.Amount}
                  symbol={tx.Symbol}
                  fallbackSymbol={userDetails?.tokenSymbol}
                  type={tx.type}
                  expanded={isExpanded}
                  onToggle={() => toggleExpanded(txId)}
                />
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

            {/* Expanded per-asset breakdown for multi-asset transfers */}
            {isExpanded && (
              <TransactionAssets
                assets={tx.Assets}
                amount={tx.Amount}
                symbol={tx.Symbol}
                fallbackSymbol={userDetails?.tokenSymbol}
                type={tx.type}
              />
            )}

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
          )
        })}
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
