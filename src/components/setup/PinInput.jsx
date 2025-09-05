import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function PinInput({ value, onChange, length = 6, error, onComplete }) {
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleInput = (index, e) => {
    const newValue = e.target.value;
    if (!/^\d*$/.test(newValue)) return;

    const newPin = value.split('');
    newPin[index] = newValue.slice(-1);
    const updatedPin = newPin.join('');
    onChange(updatedPin);

    // Move focus to next input
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && value.length === length && onComplete) {
      onComplete();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    if (!/^\d*$/.test(pastedData)) return;

    const newPin = pastedData.slice(0, length);
    onChange(newPin);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center space-x-2">
        {[...Array(length)].map((_, index) => (
          <motion.input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleInput(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`
              w-10 h-10 text-center text-xl font-bold rounded-lg
              border-2 focus:outline-none focus:ring-2
              ${error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary'
              }
              dark:bg-gray-800 dark:text-white
            `}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          />
        ))}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-600 dark:text-red-400 text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}