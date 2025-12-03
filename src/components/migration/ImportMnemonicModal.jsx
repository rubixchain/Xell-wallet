import React, { useState } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';
import { validateMnemonic } from '../../utils/migration';

const ImportMnemonicModal = ({ accountName, onImport, onClose }) => {
    const [mnemonic, setMnemonic] = useState('');
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    const handleSubmit = async () => {
        const trimmedMnemonic = mnemonic.trim();

        // Basic validation
        if (!trimmedMnemonic) {
            setError('Please enter your recovery phrase');
            return;
        }

        // Check word count
        const words = trimmedMnemonic.split(/\s+/);
        if (words.length !== 24) {
            setError('Recovery phrase must be exactly 24 words');
            return;
        }

        // Validate mnemonic format
        if (!validateMnemonic(trimmedMnemonic)) {
            setError('Invalid recovery phrase format');
            return;
        }

        setIsValidating(true);
        setError('');

        try {
            const result = await onImport(trimmedMnemonic);

            if (!result.success) {
                setError(result.message || 'Failed to import');
            }
            // If success, the modal will be closed by parent
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setIsValidating(false);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setMnemonic(text.trim());
            setError('');
        } catch (err) {
            setError('Failed to paste from clipboard');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl w-[350px] p-5 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <FiDownload className="text-primary" size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Import Account</h3>
                            <p className="text-xs text-quinary">{accountName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                        Enter the 24-word recovery phrase for this account. This will verify ownership and allow migration.
                    </p>
                </div>

                {/* Mnemonic Input */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            Recovery Phrase
                        </label>
                        <button
                            onClick={handlePaste}
                            className="text-xs text-primary hover:text-secondary"
                        >
                            Paste
                        </button>
                    </div>
                    <textarea
                        value={mnemonic}
                        onChange={(e) => {
                            setMnemonic(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter your 24-word recovery phrase..."
                        className={`w-full h-28 p-3 border rounded-lg focus:outline-none focus:ring-2 resize-none text-sm ${
                            error
                                ? 'border-red-300 focus:ring-red-200'
                                : 'border-gray-200 focus:ring-primary/20'
                        }`}
                        disabled={isValidating}
                    />
                    {error && (
                        <p className="text-red-500 text-xs mt-1">{error}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                        {mnemonic.trim().split(/\s+/).filter(w => w).length} / 24 words
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isValidating}
                        className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isValidating || !mnemonic.trim()}
                        className="flex-1 py-2 px-4 bg-primary text-white rounded-lg font-medium hover:bg-secondary disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isValidating ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                Verifying...
                            </span>
                        ) : (
                            'Verify & Import'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportMnemonicModal;
