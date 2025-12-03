import React, { useState } from 'react';
import { FiUser, FiCheck, FiX, FiDownload, FiEye, FiEyeOff } from 'react-icons/fi';

const AccountMigrationCard = ({
    account,
    state,
    onPasswordValidate,
    onSkipToggle,
    onImportClick
}) => {
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');

    const { status } = state || { status: 'pending' };

    const handleValidate = async () => {
        if (pin.length !== 6) {
            setError('PIN must be 6 digits');
            return;
        }

        setIsValidating(true);
        setError('');

        try {
            const result = await onPasswordValidate(pin);
            if (!result.success) {
                setError(result.message || 'Invalid PIN');
            }
        } catch (err) {
            setError('Validation failed');
        } finally {
            setIsValidating(false);
        }
    };

    const handlePinChange = async (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPin(value);
        setError('');

        // Auto-validate when 6 digits are entered
        if (value.length === 6) {
            setIsValidating(true);
            try {
                const result = await onPasswordValidate(value);
                if (!result.success) {
                    setError(result.message || 'Invalid PIN');
                }
            } catch (err) {
                setError('Validation failed');
            } finally {
                setIsValidating(false);
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && pin.length === 6) {
            handleValidate();
        }
    };

    const handleSkipChange = (e) => {
        const isSkipped = e.target.checked;
        onSkipToggle(isSkipped);
        if (isSkipped) {
            setPin('');
            setError('');
        }
    };

    // Render based on status
    const renderContent = () => {
        if (status === 'validated') {
            return (
                <div className="flex items-center gap-2 text-green-600">
                    <FiCheck size={20} />
                    <span className="font-medium">PIN Verified</span>
                </div>
            );
        }

        if (status === 'imported') {
            return (
                <div className="flex items-center gap-2 text-green-600">
                    <FiCheck size={20} />
                    <span className="font-medium">Imported via Recovery Phrase</span>
                </div>
            );
        }

        if (status === 'skipped') {
            return (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-600">
                            <FiX size={20} />
                            <span className="font-medium">Will be removed</span>
                        </div>
                        <button
                            onClick={() => onSkipToggle(false)}
                            className="text-xs text-primary hover:text-secondary underline"
                        >
                            Undo
                        </button>
                    </div>
                    <p className="text-xs text-orange-600">
                        This account will be permanently deleted during migration.
                    </p>
                </div>
            );
        }

        // Pending status - show input form
        return (
            <div className="space-y-3">
                {/* PIN Input */}
                <div className="relative">
                    <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={handlePinChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter 6-digit PIN"
                        className={`w-full px-3 py-2 pr-20 border rounded-lg focus:outline-none focus:ring-2 ${
                            error
                                ? 'border-red-300 focus:ring-red-200'
                                : 'border-gray-200 focus:ring-primary/20'
                        }`}
                        maxLength={6}
                        disabled={isValidating}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                        >
                            {showPin ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                        {isValidating && (
                            <div className="px-2 py-1">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <p className="text-red-500 text-xs">{error}</p>
                )}

                {/* Skip and Import options */}
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={status === 'skipped'}
                            onChange={handleSkipChange}
                            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-600">Skip this account</span>
                    </label>

                    <button
                        onClick={onImportClick}
                        className="flex items-center gap-1 text-sm text-primary hover:text-secondary"
                    >
                        <FiDownload size={14} />
                        <span>Import</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={`border rounded-xl p-4 transition-colors ${
            status === 'validated' || status === 'imported'
                ? 'bg-green-50 border-green-200'
                : status === 'skipped'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-200'
        }`}>
            {/* Account header */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-full ${
                    status === 'validated' || status === 'imported'
                        ? 'bg-green-100'
                        : status === 'skipped'
                            ? 'bg-orange-100'
                            : 'bg-gray-100'
                }`}>
                    <FiUser className={
                        status === 'validated' || status === 'imported'
                            ? 'text-green-600'
                            : status === 'skipped'
                                ? 'text-orange-600'
                                : 'text-gray-600'
                    } size={18} />
                </div>
                <div className="flex-1">
                    <p className="font-medium text-senary">{account.username}</p>
                    <p className="text-xs text-quinary truncate" title={account.did}>
                        {account.did ? `${account.did.slice(0, 20)}...` : 'No DID'}
                    </p>
                </div>
            </div>

            {/* Content based on status */}
            {renderContent()}
        </div>
    );
};

export default AccountMigrationCard;
