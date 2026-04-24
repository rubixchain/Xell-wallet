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
  }, [accountInfo?.balance, accountInfo?.ft_count, userDetails?.network]);

  useEffect(() => {
    if (accountInfo && Object.keys(accountInfo).length > 0) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [accountInfo?.balance, accountInfo?.ft_count, userDetails?.network]);

  const fetchCurrentTickerData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://www.mexc.com/api/v3/ticker/24hr?symbol=RBTUSDT');
      const data = await response.json();
      
      if (data && data.priceChangePercent) {
        setTickerData({
          s: 'RBTUSDT',
          price: parseFloat(data.lastPrice || 0),
          r: parseFloat(data.priceChangePercent || 0) / 100 // Convert percentage to decimal
        });
      } else {
        setTickerData({
          s: 'RBTUSDT',
          price: 0,
          r: 0
        });
      }
    } catch (error) {
      setTickerData({
        s: 'RBTUSDT',
        price: 0,
        r: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const networkValue = userDetails?.network ?? (isUserLoggedIn ? 1 : null);
    const shouldFetch = isUserLoggedIn && (Number(networkValue) === 1 || Number(networkValue) === 2);
    
    if (shouldFetch) {
      fetchCurrentTickerData();
    }
  }, [isUserLoggedIn, userDetails?.network]);

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

      <motion.div variants={itemVariants} className="space-y-1">
        {Number(userDetails?.network) >= 5 ? (
          <>
            <div className="text-[16px] font-bold text-white">Balance</div>
            <div className="text-[18px] font-bold text-yellow-300">
              {Number(accountInfo?.ft_count || 0).toFixed(3)} {userDetails?.tokenSymbol}
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
                const amount = isRubixNetwork ? accountInfo?.balance : accountInfo?.ft_count;
                return `${Number(amount || 0).toFixed(3)} ${userDetails?.tokenSymbol || 'RBT'}`;
              })()}
            </motion.div>
          </>
        )}
      </motion.div>
    </motion.div >
  );
}