import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiDownload, FiRefreshCw, FiRefreshCcw, FiMap } from 'react-icons/fi';
import { MdGeneratingTokens } from "react-icons/md";
import SendModal from '../modals/SendModal';
import ReceiveModal from '../modals/ReceiveModal';
import BuySellModal from '../modals/BuySellModal';
import { useEffect } from 'react';

export default function ActionButtons({ accountInfo, setIsTransactionCompleted }) {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isBuySellModalOpen, setIsBuySellModalOpen] = useState(false);
  const [isTokensModalOpen, setIsTokensModalOpen] = useState(false);
  useEffect(() => {
    if (isSendModalOpen || isReceiveModalOpen || isBuySellModalOpen) {
      document.body.style.overflow = 'hidden'; // Prevent body scroll when modal is open
    } else {
      document.body.style.overflow = 'unset'; // Reset when modal closes
    }

    return () => {
      document.body.style.overflow = 'unset'; // Cleanup on unmount
    };
  }, [isSendModalOpen, isReceiveModalOpen, isBuySellModalOpen]);

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const buttonVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };

  const actions = [
    {
      icon: FiRefreshCcw,
      label: 'Buy/Sell',
       onClick: () => setIsBuySellModalOpen(true),
      bgColor: 'bg-gray-400',
      iconColor: 'text-gray-600',
      disabled: true
    },
    {
      icon: FiDownload,
      label: 'Receive',
      onClick: () => setIsReceiveModalOpen(true),
      bgColor: 'bg-secondary',
      iconColor: 'text-white'
    },
    {
      icon: FiSend,
      label: 'Send',
      onClick: () => setIsSendModalOpen(true),
      bgColor: 'bg-secondary',
      iconColor: 'text-white'
    },

    // {
    //   icon: MdGeneratingTokens,
    //   label: 'Tokens',
    //   onClick: () => setIsTokensModalOpen(true),
    //   bgColor: 'bg-secondary',
    //   iconColor: 'text-white'
    // },
  ];

  return (
    <>
      <motion.div
        className="flex items-center w-full justify-between mt-2"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {actions.map(({ icon: Icon, label, onClick, bgColor, iconColor, disabled }) => (
          <motion.button
            key={label}
            onClick={disabled ? undefined : onClick}
            variants={buttonVariants}
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            className='flex flex-col items-center justify-center'
            disabled={disabled}
          >
            <div
              className={`p-3 ${bgColor} w-fit rounded-full flex flex-col items-center space-y-1 text-white ${disabled ? 'shadow-none cursor-not-allowed opacity-60' : 'shadow-lg hover:shadow-xl'} transition-shadow`}
            >
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <span className={`font-normal text-sm ${disabled ? 'text-gray-500' : ''}`}>{label}</span>
          </motion.button>
        ))}
      </motion.div>

      <SendModal
        setIsTransactionCompleted={setIsTransactionCompleted}
        accountInfo={accountInfo}
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
      <ReceiveModal
        accountInfo={accountInfo}
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
      />
      <BuySellModal
        isOpen={isBuySellModalOpen}
        onClose={() => setIsBuySellModalOpen(false)}
      />
    </>
  );
}