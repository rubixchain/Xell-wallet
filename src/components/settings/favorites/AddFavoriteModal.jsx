import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiStar } from 'react-icons/fi';
import { useFavorites } from '../../../hooks/useFavorites';

export default function AddFavoriteModal({ isOpen, onClose, favorite }) {
  const { addFavorite, updateFavorite } = useFavorites();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (favorite) {
      setName(favorite.name);
      setAddress(favorite.address);
    } else {
      setName('');
      setAddress('');
    }
    setError('');
  }, [favorite]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name.trim() || !address.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic address validation - in a real app, use proper validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid address format');
      return;
    }

    try {
      if (favorite) {
        updateFavorite({ ...favorite, name, address });
      } else {
        addFavorite({ name, address });
      }
      onClose();
    } catch (error) {
      setError(error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiStar className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {favorite ? 'Edit Favorite' : 'Add Favorite'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800"
                placeholder="Enter a name for this address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800 font-mono"
                placeholder="0x..."
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {favorite ? 'Save Changes' : 'Add Favorite'}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}