import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiTrash2, FiCopy } from 'react-icons/fi';
import DeleteFavoriteModal from './DeleteFavoriteModal';
import { useFavorites } from '../../../hooks/useFavorites';

export default function FavoritesList({ onEdit }) {
  const { favorites, removeFavorite } = useFavorites();
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, favorite: null });

  const handleCopy = async (address) => {
    await navigator.clipboard.writeText(address);
    // Show toast notification
  };

  const handleDelete = (favorite) => {
    setDeleteModal({ isOpen: true, favorite });
  };

  const confirmDelete = () => {
    removeFavorite(deleteModal.favorite.id);
    setDeleteModal({ isOpen: false, favorite: null });
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {favorites.map((favorite) => (
          <motion.div
            key={favorite.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {favorite.name}
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-sm text-gray-600 dark:text-gray-400">
                    {favorite.address}
                  </code>
                  <button
                    onClick={() => handleCopy(favorite.address)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <FiCopy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => onEdit(favorite)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiEdit2 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(favorite)}
                  className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiTrash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {favorites.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No favorite addresses yet. Add some to get started.
        </div>
      )}

      <DeleteFavoriteModal
        isOpen={deleteModal.isOpen}
        favorite={deleteModal.favorite}
        onConfirm={confirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, favorite: null })}
      />
    </div>
  );
}