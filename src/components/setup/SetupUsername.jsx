import { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiUser } from 'react-icons/fi';
import Button from '../Button';
import { UserContext } from '../../context/userContext';

export default function SetupUsername({ onSubmit }) {
  const { userDetails } = useContext(UserContext)
  const [username, setUsername] = useState(userDetails?.username || '');
  const [error, setError] = useState('');


  const handleSubmit = (e) => {
    e.preventDefault();

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    onSubmit(username);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-tertiary rounded-xl flex items-center justify-center">
          <FiShield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-senary dark:text-white">
            Choose Username
          </h1>
          <p className="text-quinary text-base dark:text-gray-300">
            This will be your unique identifier
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            className="w-full px-4 py-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary dark:text-white dark:bg-gray-800"
            placeholder="Enter username"
            autoFocus
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
        </div>

        <Button type="submit" disabled={!username.trim()}>
          Continue
        </Button>
      </form>
    </div>
  );
}