import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit2, FiTrash2, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function QuorumList({ onEdit }) {
  const [quorums, setQuorums] = useState([
    {
      id: 1,
      name: 'Primary Quorum',
      validators: [
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0x123...456',
        '0x789...012',
        '0xabc...def',
        '0xghi...jkl',
      ],
      isActive: true,
    },
    {
      id: 2,
      name: 'Secondary Quorum',
      validators: [
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0x123...456',
        '0x789...012',
      ],
      isActive: false,
    },
  ]);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    quorum: null,
  });

  const handleDelete = (quorum) => {
    setDeleteModal({
      isOpen: true,
      quorum,
    });
  };

  const confirmDelete = () => {
    setQuorums(prev => prev.filter(q => q.id !== deleteModal.quorum.id));
    setDeleteModal({ isOpen: false, quorum: null });
  };


  return (
    <div className="space-y-4">
      <AnimatePresence>
        {quorums.map((quorum) => (
          <motion.div
            key={quorum.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {quorum.name}
                </h4>
                {quorum.isActive && (
                  <span className="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <FiCheck className="w-3 h-3" />
                    <span>Active</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => onEdit(quorum)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiEdit2 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(quorum)}
                  className="p-2 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiTrash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {quorum.validators.length} Validators
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quorum.validators.slice(0, 4).map((validator, i) => (
                  <div
                    key={i}
                    className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded truncate"
                  >
                    {validator}
                  </div>
                ))}
                {quorum.validators.length > 4 && (
                  <div className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded text-gray-500">
                    +{quorum.validators.length - 4} more
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {quorums.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-gray-500 dark:text-gray-400"
        >
          No quorums found. Create one to get started.
        </motion.div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        quorum={deleteModal.quorum}
        onConfirm={confirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, quorum: null })}
      />
    </div>
  );
}