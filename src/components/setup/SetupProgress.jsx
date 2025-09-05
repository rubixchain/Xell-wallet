import { motion } from 'framer-motion';

export default function SetupProgress({ currentStep, totalSteps }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        {[...Array(totalSteps)].map((_, index) => (
          <motion.div
            key={index}
            className={`h-2 rounded-full flex-1 mx-1 ${index + 1 <= currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          />
        ))}
      </div>
      <p className="text-sm text-quinary font-medium dark:text-gray-400 text-center">
        Step {currentStep} of {totalSteps}
      </p>
    </div>
  );
}