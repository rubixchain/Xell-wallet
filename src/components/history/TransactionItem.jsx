import { FiArrowUpRight, FiArrowDownLeft, FiCopy } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "react-hot-toast"
import { getTimeAgo, sliceString } from '../../utils/utils';
import { useContext, useState } from 'react';
import { UserContext } from '../../context/userContext';
import { buildTxnExplorerUrl } from '../../utils/network';
import { TransactionAmount, TransactionAssets } from '../TransactionAmount';
export default function TransactionItem({ type, Status, Amount, Symbol, Assets, Epoch, SenderDID, TransactionID, ReceiverDID, iconBg, DateTime }) {
  const { selectedNetwork, userDetails } = useContext(UserContext)
  const [expanded, setExpanded] = useState(false)

  const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 }
  };

  const handleCopy = async (item) => {
    await navigator.clipboard.writeText(item);
    toast.success('Copied to clipboard')
  };


  const onClickTxnId = (id) => {
    const finalUrl = buildTxnExplorerUrl(userDetails?.network, id);
    if (!finalUrl) return;
    window.open(finalUrl, '_blank')
  }
  return (
    <motion.div
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      variants={itemVariants}
      className="border-2 border-[#E5E7EB] p-2 overflow-auto w-full rounded-lg hover:bg-gray-50 transition-colors"
      whileHover={{ x: 0.3 }}
    >
      <div className="flex items-center w-full justify-between">
      <div className="flex items-center space-x-3  ">
        <motion.div
          className={` rounded-lg flex items-center justify-center ${!Status ? 'bg-red-100/50' : type === 'Sent' ? 'bg-primary-soft' : 'bg-emerald-100/50'
            }`}

        >
          {type === 'Sent' ?
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className={`rounded-lg bg-primary p-1`}>
              <FiArrowUpRight className={`w-5 h-5 text-white `} />
            </motion.div> :
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
              className={`rounded-lg bg-emerald-600 p-1`}>
              <FiArrowDownLeft className="w-5 h-5 text-white" />
            </motion.div>
          }
        </motion.div>
        <div className=''>
          <div className="flex items-center space-x-2 ">
            <span className="font-semibold text-senary text-base dark:text-white">{type}</span>
            <span className={`text-sm px-2 py-0.5 rounded ${!Status
              ? 'bg-red-100/50 text-red-600'
              : 'bg-green-100/50 text-green-600'
              }`}>
              {Status ? 'Success' : 'Failed'}
            </span>
          </div>
          <div className="text-sm text-nowrap font-medium text-gray-500">{getTimeAgo(Epoch, DateTime)}</div>
          <div className="flex text-sm font-medium  text-nowrap text-gray-500">Txn ID:
            <p onClick={() => onClickTxnId(TransactionID)} className='underline ms-2 text-blue-500 cursor-pointer'>{sliceString(TransactionID, 6)}</p>
            <motion.button
              onClick={() => handleCopy(TransactionID)}
              className="p-1 hover:text-gray-700 dark:hover:text-gray-300"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiCopy className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
      <div className="ms-8 ">
        {/* <div className="font-semibold  text-gray-900 dark:text-white text-base text-nowrap  text-senary">{Amount}
          <span className=' ms-1'>{userDetails?.tokenSymbol}</span>
        </div> */}
        <TransactionAmount
          assets={Assets}
          amount={Amount}
          symbol={Symbol}
          fallbackSymbol={userDetails?.tokenSymbol}
          type={type}
          expanded={expanded}
          onToggle={() => setExpanded((e) => !e)}
        />
        <div className="flex items-center justify-end space-x-1 text-base text-quinary font-medium">
          <span className='text-sm'>{sliceString(type === 'Sent' ? ReceiverDID : SenderDID, 4)}</span>
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
      {expanded && (
        <TransactionAssets
          assets={Assets}
          amount={Amount}
          symbol={Symbol}
          fallbackSymbol={userDetails?.tokenSymbol}
          type={type}
        />
      )}
    </motion.div>
  );
}