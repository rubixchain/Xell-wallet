import { motion } from 'framer-motion';
import { FiArrowLeft, FiCopy, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { useContext, useEffect, useState, useRef } from 'react';
import {
  convertCurrency,
  generateSignature
} from "../../utils"
import { UserContext } from '../../context/userContext';
import toast from 'react-hot-toast';
import { NETWORK_TYPES } from '../../../config';

const ShimmerCard = () => (
  <motion.div
    className="flex justify-between items-center [background:linear-gradient(0deg,#033500,#033500),radial-gradient(117.1%_345.76%_at_49.91%_104.8%,rgba(255,227,20,0)_0%,rgba(255,227,20,0.2)_100%),radial-gradient(124.84%_309.96%_at_4.03%_100%,rgba(255,227,20,0.15)_0%,rgba(255,227,20,0)_100%)] [box-shadow:0px_0px_1px_0px_#0000000D,0px_2px_2px_0px_#0000000A,0px_4px_2px_0px_#00000008,0px_7px_3px_0px_#00000003,0px_11px_3px_0px_#00000000] rounded-lg p-4 shadow-md"

    initial="initial"
    animate="animate"
    transition={{ duration: 0.3 }}
  >
    <motion.div className="space-y-1">
      <motion.div
        className="w-20 h-6 bg-gray-700 rounded animate-pulse"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      ></motion.div>
      <div className="w-10 h-4 bg-gray-700 rounded animate-pulse"></div>
    </motion.div>

    <motion.div

      className="flex space-x-1 items-center"
    >
      <div className="bg-gray-700 p-2 h-9 w-9 rounded-xl animate-pulse"></div>
      <div>
        <motion.div
          className="w-16 h-6 bg-gray-700 rounded-full animate-pulse"
          whileHover={{ scale: 1.1 }}
        ></motion.div>
        <span className="w-20 h-3 bg-gray-700 rounded animate-pulse block mt-1"></span>
      </div>
    </motion.div>
  </motion.div>
);


export default function BalanceCard({ accountInfo, setIsTransactionCompleted }) {
  const { isUserLoggedIn, currency, setCurrency, userDetails } = useContext(UserContext)
  const [tickerData, setTickerData] = useState({});
  const [conversionPrice, setConversionPrice] = useState(0)
  const [isRotating, setIsRotating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef(null);

  const symbolConversion = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹'
  };

  useEffect(() => {
    if (accountInfo && Object.keys(accountInfo).length > 0) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [accountInfo?.rbt_amount, accountInfo?.ft_count, userDetails?.network]);

  useEffect(() => {
    if (accountInfo && Object.keys(accountInfo).length > 0) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [accountInfo?.rbt_amount, accountInfo?.ft_count, userDetails?.network]);

  const [selectedToken, setSelectedToken] = useState({ symbol: 'RBT', name: 'Xell Token' });
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 }
  };

  const handleClickCopy = () => {
    navigator.clipboard.writeText(accountInfo?.did)
    toast.success("Copied to clipboard")
  }

  const hasValidBalanceData = accountInfo && Object.keys(accountInfo).length > 0;



  if (!hasValidBalanceData) {

    return <ShimmerCard />
  }
  return (
    <motion.div
      className="relative flex justify-between items-center [background:linear-gradient(0deg,#033500,#033500),radial-gradient(117.1%_345.76%_at_49.91%_104.8%,rgba(255,227,20,0)_0%,rgba(255,227,20,0.2)_100%),radial-gradient(124.84%_309.96%_at_4.03%_100%,rgba(255,227,20,0.15)_0%,rgba(255,227,20,0)_100%)] [box-shadow:0px_0px_1px_0px_#0000000D,0px_2px_2px_0px_#0000000A,0px_4px_2px_0px_#00000008,0px_7px_3px_0px_#00000003,0px_11px_3px_0px_#00000000] rounded-lg p-4 shadow-md"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => {
          setIsRotating(true);
          setIsTransactionCompleted(prev => !prev)
          setTimeout(() => setIsRotating(false), 1000);
        }}
        style={{
          zIndex: 1
        }}
        className="text-white/80 hover:text-white absolute top-3 right-3 "

      >
        <FiRefreshCw className="w-4 h-4" />
      </button>
      {/* <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TokenSelector
            selectedToken={selectedToken}
            onTokenSelect={setSelectedToken}
          />
          <div className="flex items-center space-x-1">
            <span className="text-white text-xs">{accountInfo?.did?.slice(0, 5) + '....' + accountInfo?.did?.slice(-5)}</span>
            <motion.button
              onClick={handleClickCopy}
              className="text-white/80 hover:text-white"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiCopy className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
        <motion.button
          onClick={() => {
            setIsRotating(true);
            setIsTransactionCompleted(prev => !prev)
            setTimeout(() => setIsRotating(false), 1000);
          }}
          className="text-white/80 hover:text-white"
          animate={{ rotate: isRotating ? 180 : 0 }}
          transition={{ duration: 0.6 }}
        >
          <FiRefreshCw className="w-4 h-4" />
        </motion.button>
      </div> */}

      <motion.div variants={itemVariants} className="space-y-1">
        {Number(userDetails?.network) >= 5 ? (
          <>
            <div className="text-[16px] font-bold text-white">Balance</div>
            <div className="text-[18px] font-bold text-yellow-300">
              {(accountInfo?.ft_count || 0)} {userDetails?.tokenSymbol}
            </div>
          </>
        ) : (
          <>
            <motion.div
              className="text-[18px] font-bold text-yellow-300"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
            >
              {(() => {
                const networkValue = userDetails?.network ?? (isUserLoggedIn ? 1 : null);
                const isRubixNetwork = Number(networkValue) === 1 || Number(networkValue) === 2;
                const amount = isRubixNetwork ? accountInfo?.rbt_amount : accountInfo?.ft_count;
                return `${amount || 0} ${userDetails?.tokenSymbol || 'RBT'}`;
              })()}
            </motion.div>
            {/* {(() => {
              const networkValue = userDetails?.network ?? (isUserLoggedIn ? 1 : null);
              return (Number(networkValue) === 1 || Number(networkValue) === 2);
            })() && (isLoading ? (<motion.div variants={itemVariants} className="w-24 h-6 bg-gray-700/30 rounded animate-pulse" />) : (
              <motion.div variants={itemVariants} className="text-[12px] flex items-center text-white">
                {symbolConversion[currency?.value]} {(() => {
                  const networkValue = userDetails?.network ?? (isUserLoggedIn ? 1 : null);
                  const tokenAmount = (Number(networkValue) === 1 || Number(networkValue) === 2)
                    ? (accountInfo?.rbt_amount || 0)
                    : (accountInfo?.ft_count || 0);
                  const usdValue = tokenAmount * (conversionPrice || 0);
                 
                  return usdValue.toFixed(2);
                })()}
              </motion.div>
            ))} */}
          </>
        )}
      </motion.div>
      {/* {(() => {
        // Show 24hr change for Rubix networks (1 and 2)
        // If network is undefined/null, check if we're logged in - if yes, default to showing (network 1)
        const networkValue = userDetails?.network ?? (isUserLoggedIn ? 1 : null);
        // Convert to number for comparison to handle both string and number types
        const shouldShow24hr = (Number(networkValue) === 1 || Number(networkValue) === 2);
       
        return shouldShow24hr;
      })() ? (<motion.div
        variants={itemVariants}
        className="flex space-x-1 items-center"
      >
        <div className='bg-yellow-300 p-2 h-fit rounded-xl'>
          {isLoading ? (
            <div className="w-5 h-5 bg-gray-400 rounded animate-pulse"></div>
          ) : (
            <FiArrowLeft className={`h-5 w-5 transform  ${tickerData?.r >= 0 ? 'rotate-[145deg]' : 'rotate-[-145deg]'} `} />
          )}
        </div>
        <div>
          {isLoading ? (
            <>
              <div className="w-16 h-4 bg-gray-400 rounded animate-pulse"></div>
              <div className="w-20 h-3 bg-gray-400 rounded animate-pulse mt-1"></div>
            </>
          ) : (
            <>
              <motion.div
                className={`px-2 rounded-full ${tickerData?.r >= 0 ? 'text-green-500' : 'text-red-500'} text-xs font-semibold`}
                whileHover={{ scale: 1.1 }}
              >
                {(tickerData?.r * 100)?.toFixed(2)}%
              </motion.div>
              <span className="text-white/60 ms-2 mt-0 pt-0 text-xs font-medium">24hr change</span>
            </>
          )}
        </div>
      </motion.div>) : null} */}
    </motion.div >
  );
}