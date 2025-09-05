import { FiShield, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function QuorumStats() {
  const stats = [
    {
      icon: FiUsers,
      label: 'Total Validators',
      value: '15',
      change: '+2 this month'
    },
    {
      icon: FiShield,
      label: 'Active Quorums',
      value: '2',
      change: 'of 3 total'
    },
    {
      icon: FiCheckCircle,
      label: 'Success Rate',
      value: '99.9%',
      change: 'last 30 days'
    }
  ];

  return (
    <div className="space-y-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {stat.label}
              </div>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.change}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}