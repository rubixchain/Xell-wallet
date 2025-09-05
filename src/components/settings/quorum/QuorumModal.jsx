import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUpload, FiPlus, FiTrash2 } from 'react-icons/fi';

export default function QuorumModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [validators, setValidators] = useState(['']);
  const [file, setFile] = useState(null);

  const handleAddValidator = () => {
    setValidators([...validators, '']);
  };

  const handleRemoveValidator = (index) => {
    setValidators(validators.filter((_, i) => i !== index));
  };

  const handleValidatorChange = (index, value) => {
    const newValidators = [...validators];
    newValidators[index] = value;
    setValidators(newValidators);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you would parse the JSON file here
      setFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Quorum
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Quorum Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quorum Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800"
                placeholder="Enter quorum name"
              />
            </div>

            {/* JSON Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Validators JSON
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary">
                    <FiUpload className="w-5 h-5" />
                    <span>{file ? file.name : 'Choose file'}</span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Manual Validator Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Validators
                </label>
                <button
                  onClick={handleAddValidator}
                  className="flex items-center space-x-1 text-primary hover:text-primary-light"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Add Validator</span>
                </button>
              </div>

              {validators.map((validator, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={validator}
                    onChange={(e) => handleValidatorChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary dark:bg-gray-800"
                    placeholder="Enter validator address"
                  />
                  {validators.length > 1 && (
                    <button
                      onClick={() => handleRemoveValidator(index)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-light"
                disabled={!name || validators.some(v => !v)}
              >
                Create Quorum
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}