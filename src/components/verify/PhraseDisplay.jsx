import { motion } from 'framer-motion';
import { FiHelpCircle } from 'react-icons/fi';

export default function PhraseDisplay({ phrase, verificationIndices, inputValues, onChange, error }) {
  const words = phrase.split(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recovery Phrase
        </h2>
        <div className="flex items-center space-x-1 text-gray-500 font-medium text-base text-gray-500">
          <FiHelpCircle className="w-4 h-4" />
          <span>Fill in the highlighted words</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {words.map((word, index) => {
          const isMissing = verificationIndices.includes(index);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                relative p-3 font-bold  rounded-lg text-center font-mono
                ${isMissing
                  ? 'bg-surface-low dark:bg-primary/10 '
                  : 'bg-white dark:bg-gray-800'
                }
                ${error && isMissing ? 'ring-2 ring-red-500' : ''}
              `}
            >
              {isMissing ? (
                <input
                  type="text"
                  value={inputValues[index] || ''}
                  onChange={(e) => onChange(index, e.target.value.toLowerCase())}
                  className="w-full  text-center bg-transparent text-black-600 border-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                  placeholder={`WORD ${index + 1}`}
                />
              ) : (
                <span className="text-gray-900 dark:text-gray-200">
                  {word}
                </span>
              )}
            </motion.div>
          );
        })}
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