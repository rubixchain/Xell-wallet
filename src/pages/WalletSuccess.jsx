import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../components/Card';
import { FiCheck } from 'react-icons/fi';
import { routes } from '../routes/routes';

export default function WalletSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(routes.DASHBOARD, { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Card>
      <motion.div
        className="space-y-6 text-center flex flex-col h-full items-center justify-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <FiCheck className="w-8 h-8 text-primary" />
          </div>
        </motion.div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Success!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your wallet has been successfully restored
          </p>
        </div>

        <motion.p
          className="text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Redirecting to dashboard...
        </motion.p>
      </motion.div>
    </Card>
  );
}