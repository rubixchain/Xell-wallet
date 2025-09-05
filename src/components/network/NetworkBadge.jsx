import { motion } from 'framer-motion';

export default function NetworkBadge({ network }) {
  const networks = {
    mainnet: {
      label: 'Mainnet',
      color: 'bg-green-500',
      glow: 'shadow-green-500/20'
    },
    testnet: {
      label: 'Testnet',
      color: 'bg-purple-500',
      glow: 'shadow-purple-500/20'
    }
  };

  const { label, color, glow } = networks[network];

  return (
    <div className="flex items-center space-x-2">
      <motion.div 
        className={`w-2 h-2 rounded-full ${color} shadow-lg ${glow}`}
        initial={false}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
      />
      <span className="text-sm font-medium bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
        {label}
      </span>
    </div>
  );
}