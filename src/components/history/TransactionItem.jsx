import { motion } from 'framer-motion';
import { FiArrowUpRight, FiArrowDownLeft, FiCopy } from 'react-icons/fi';
import { getTimeAgo, sliceString } from '../../utils/utils';
import { buildTxnExplorerUrl } from '../../utils/network';
import { TransactionAmount, TransactionAssets } from '../TransactionAmount';
import { useContext, useState } from 'react';
import { UserContext } from '../../context/userContext';
import toast from 'react-hot-toast';

export default function TransactionItem({ type, Status, Amount, Symbol, Assets, Epoch, DateTime, SenderDID, TransactionID, ReceiverDID }) {
  const { userDetails } = useContext(UserContext);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const onClickTxnId = (id) => {
    const finalUrl = buildTxnExplorerUrl(userDetails?.network, id);
    if (!finalUrl) return;
    window.open(finalUrl, '_blank')
  }

  return (
    <motion.div
      className="w-full p-4 border border-[#E5E7EB] rounded-lg bg-white dark:bg-gray-800 transition-colors flex flex-col gap-2 mb-3"
      style={{ boxShadow: 'none' }}
    >
      {/* TOP ROW: Left Block vs Right Block */}
      <div className="flex justify-between w-full">
        {/* LEFT: Icon + (Status + Time) */}
        <div className="flex items-start gap-2">
          <motion.div
            className={`p-2 rounded-lg flex items-center justify-center ${!Status ? 'bg-red-100/50' : type === 'Sent' ? 'bg-primary-soft' : 'bg-emerald-100/50'}`}
          >
            {type === 'Sent' ? (
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
            <span className={`text-[14px] px-2 py-0.5 rounded ${!Status ? 'bg-red-100/50 text-red-600' : 'bg-green-100/50 text-green-600'}`}>
              {Status ? "Success" : "Failed"}
            </span>
            <span className="text-[12px] text-gray-500">
              {getTimeAgo(Epoch, DateTime)}
            </span>
          </div>
        </div>

        {/* RIGHT: Amount (single, or "first + more" expandable) + DID */}
        <div className="flex flex-col items-end leading-tight">
          <TransactionAmount
            assets={Assets}
            amount={Amount}
            symbol={Symbol}
            fallbackSymbol={userDetails?.tokenSymbol}
            type={type}
            expanded={expanded}
            onToggle={() => setExpanded((prev) => !prev)}
          />
          <div className="flex items-center gap-1 text-[14px] text-quinary font-medium">
            <span>{sliceString(type === 'Sent' ? ReceiverDID : SenderDID, 4)}</span>
            <motion.button
              onClick={() => handleCopy(type === 'Sent' ? ReceiverDID : SenderDID)}
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
      {expanded && (
        <TransactionAssets
          assets={Assets}
          amount={Amount}
          symbol={Symbol}
          fallbackSymbol={userDetails?.tokenSymbol}
          type={type}
        />
      )}

      {/* TXN ID: full width at bottom */}
      <div className="flex items-center text-[14px] font-medium text-gray-500">
        <span>Txn ID:</span>
        <div className="flex items-center ms-1 flex-shrink-0 overflow-hidden">
          <p
            onClick={() => onClickTxnId(TransactionID)}
            className="text-blue-500 cursor-pointer underline decoration-1 inline-block whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {sliceString(TransactionID, 6)}
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
