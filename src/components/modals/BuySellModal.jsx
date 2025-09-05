import { useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiArrowLeft, FiDollarSign, FiCreditCard, FiRefreshCw } from 'react-icons/fi';
import Button from '../Button';
import { UserContext } from '../../context/userContext';

export default function BuySellModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('select'); // select, buy, sell
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { userDetails } = useContext(UserContext);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onClose();
    }, 2000);
  };

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      onClose('select');
      setMode
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClickOutside}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl overflow-hidden"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b-2 pb-3">
            <div className="flex items-center space-x-3 ">
              {mode !== 'select' && (
                <button
                  onClick={() => setMode('select')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">
                Buy or Sell {userDetails?.tokenSymbol || "tokens"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'select' ? (
              <SelectMode onSelect={setMode} />
            ) : (
              <TransactionForm
                mode={mode}
                amount={amount}
                setAmount={setAmount}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                onSubmit={handleSubmit}
                isProcessing={isProcessing}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function SelectMode({ onSelect }) {
  const { userDetails } = useContext(UserContext);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <button
        // onClick={() => onSelect('buy')}
        className="w-full p-4 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
            <FiDollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-senary dark:text-white">Buy {userDetails?.tokenSymbol || "tokens"}</h3>
            <p className="text-quinary font-medium dark:text-gray-400">Purchase {userDetails?.tokenSymbol || "tokens"} with fiat currency</p>
          </div>
        </div>
      </button>

      <button
        // onClick={() => onSelect('sell')}
        className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
            <FiRefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-senary dark:text-white">Sell {userDetails?.tokenSymbol || "tokens"}</h3>
            <p className="text-quinary font-medium dark:text-gray-400">Convert {userDetails?.tokenSymbol || "tokens"} to fiat currency</p>
          </div>
        </div>
      </button>

      {/* <div className="mt-6 p-4 bg-[#FEFEE8] dark:bg-yellow-900/20 rounded-lg">
        <p className="font-medium text-yellow-600 dark:text-yellow-200">
          Current exchange rate: 1 RBT = $0.91 USD
        </p>
      </div> */}
    </motion.div>
  );
}

function TransactionForm({ mode, amount, setAmount, paymentMethod, setPaymentMethod, onSubmit, isProcessing }) {
  const paymentMethods = [
    { id: 'bank', label: 'Bank Transfer', icon: FiCreditCard },
    { id: 'card', label: 'Credit/Debit Card', icon: FiCreditCard },
  ];

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onSubmit={onSubmit}
      className="space-y-6"
    >
      {/* Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Amount ({mode === 'buy' ? 'USD' : 'RBT'})
        </label>
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            ≈ {amount ? `${(parseFloat(amount) * (mode === 'buy' ? 1.1 : 0.91)).toFixed(2)} ${mode === 'buy' ? 'RBT' : 'USD'}` : '0.00'}
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {mode === 'buy' ? 'Payment Method' : 'Payout Method'}
        </label>
        <div className="grid grid-cols-2 gap-4">
          {paymentMethods.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentMethod(id)}
              className={`
                p-4 rounded-lg border-2 transition-colors text-left
                ${paymentMethod === id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }
              `}
            >
              <Icon className="w-6 h-6 mb-2 text-primary" />
              <span className="block font-medium text-gray-900 dark:text-white">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
          <span className="text-gray-900 dark:text-white">1 RBT = $0.91 USD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
          <span className="text-gray-900 dark:text-white">$1.50</span>
        </div>
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between font-medium">
          <span className="text-gray-900 dark:text-white">Total</span>
          <span className="text-gray-900 dark:text-white">
            ${amount ? (parseFloat(amount) + 1.50).toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!amount || !paymentMethod || isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          `${mode === 'buy' ? 'Buy' : 'Sell'} RBT`
        )}
      </Button>
    </motion.form>
  );
}