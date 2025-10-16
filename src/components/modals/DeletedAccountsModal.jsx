import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeletedAccountsModal({ isOpen, onClose, deletedAccounts, onContinue }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <AnimatePresence>
                <motion.div
                    className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold text-senary dark:text-white mb-4">
                        Accounts Deleted
                    </h2>

                    <p className="text-sm text-quinary mb-3">
                        Wrong password entered for:
                    </p>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
                        <ul className="space-y-2">
                            {deletedAccounts.map((username, index) => (
                                <li key={index} className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 dark:text-red-400">@{username}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-sm text-quinary mb-6">
                        These accounts have been permanently removed.
                    </p>

                    <button
                        onClick={onContinue}
                        className="w-full bg-secondary hover:bg-primary text-quaternary font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Continue
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
