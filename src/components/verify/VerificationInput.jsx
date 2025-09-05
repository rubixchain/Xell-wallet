import { useState } from 'react';
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export default function VerificationInput({ index, word, onChange, value, isCorrect }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Word {index + 1}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full px-4 py-3 rounded-lg transition-all
            ${isFocused 
              ? 'ring-2 ring-primary/20 border-primary' 
              : 'border-gray-200 dark:border-gray-700'
            }
            ${value && (
              isCorrect === true 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : isCorrect === false 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : ''
            )}
            border bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
          `}
          placeholder="Enter the missing word"
        />
        {value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCorrect === true ? (
              <FiCheckCircle className="w-5 h-5 text-green-500" />
            ) : isCorrect === false ? (
              <FiAlertCircle className="w-5 h-5 text-red-500" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}