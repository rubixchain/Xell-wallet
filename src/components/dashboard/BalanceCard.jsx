import { motion } from 'framer-motion';
import { FiRefreshCw } from 'react-icons/fi';
import { useContext, useState } from 'react';
import { UserContext } from '../../context/userContext';

const ShimmerCard = () => (
  <div className="py-6 flex justify-center">
    <div className="w-44 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
  </div>
);

export default function BalanceCard({ accountInfo, setIsTransactionCompleted }) {
  const { userDetails } = useContext(UserContext)
  const [isRotating, setIsRotating] = useState(false);

  const balanceLoaded = accountInfo?.balance !== undefined && accountInfo?.balance !== null;

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // if (!tickerData?.price) {
  //   return <ShimmerCard />
  // }
  return (
    <motion.div
      className="px-6 py-1.5 mx-4 my-1 flex flex-col items-center justify-center text-center"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Total Balance
        </span>
        <motion.button
          onClick={() => {
            setIsRotating(true);
            setIsTransactionCompleted(prev => !prev)
            setTimeout(() => setIsRotating(false), 1000);
          }}
          className="text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          animate={{ rotate: isRotating ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          aria-label="Refresh balance"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      </div>
      <motion.div
        className="flex items-baseline"
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {(() => {
          // Post-merge every network is Rubix, so the balance card always shows
          // the native RBT balance. FTs are listed in the FTs tab instead.
          // While switching accounts accountInfo is reset to {}, so the balance
          // is undefined until the new value loads — show a placeholder instead
          // of flashing 0 (0 is also a valid loaded balance).
          if (!balanceLoaded) {
            return (
              <div className="relative h-12 w-44 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 dark:via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" />
              </div>
            );
          }
          const amount = parseFloat(parseFloat(accountInfo?.balance || 0).toFixed(3));
          return (
            <>
              <span className="text-5xl font-bold tracking-tight text-primary dark:text-white">{amount}</span>
              <span className="text-2xl font-semibold text-gray-400 dark:text-white/60 ml-2">{userDetails?.tokenSymbol}</span>
            </>
          );
        })()}
      </motion.div>
    </motion.div>
  );
}
