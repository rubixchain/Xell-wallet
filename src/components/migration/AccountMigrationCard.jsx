import React, { useState, useRef } from 'react';
import { FiUser, FiCheck, FiAlertCircle, FiKey } from 'react-icons/fi';

const AccountMigrationCard = ({
    account,
    state,
    onPasswordValidate,
    onSkipToggle,
    onImportClick,
    autoFocus = false
}) => {
    const [pin, setPin] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState('');
    const inputRefs = useRef([]);

    const { status } = state || { status: 'pending' };

    const handlePinInput = async (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newPin = pin.split('');
        newPin[index] = value.slice(-1);
        const updatedPin = newPin.join('');
        setPin(updatedPin);
        setError('');

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (updatedPin.length === 6) {
            setIsValidating(true);
            try {
                const result = await onPasswordValidate(updatedPin);
                if (!result.success) {
                    setError(result.message || 'Invalid PIN');
                }
            } catch {
                setError('Validation failed');
            } finally {
                setIsValidating(false);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSkipClick = () => {
        onSkipToggle(status !== 'skipped');
        setPin('');
        setError('');
    };

    const getStatusBadge = () => {
        if (status === 'validated') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Verified
                </span>
            );
        }
        if (status === 'imported') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Imported
                </span>
            );
        }
        if (status === 'skipped') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <FiAlertCircle size={12} />
                    Skip
                </span>
            );
        }
        return null;
    };

    const renderContent = () => {
        if (status === 'validated' || status === 'imported') {
            return null;
        }

        if (status === 'skipped') {
            return (
                <div className="py-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-amber-600">This account will be removed</p>
                        <button
                            onClick={handleSkipClick}
                            className="text-xs font-medium text-secondary hover:text-primary transition-colors"
                            type="button"
                            aria-label="Undo skip"
                        >
                            Undo
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-2 ml-12">
                <div className="flex items-center gap-1.5">
                    {[...Array(6)].map((_, index) => (
                        <input
                            key={index}
                            ref={el => inputRefs.current[index] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={pin[index] || ''}
                            onChange={(e) => handlePinInput(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            autoFocus={autoFocus && index === 0}
                            disabled={isValidating}
                            aria-label={`PIN digit ${index + 1}`}
                            className={`w-9 h-9 text-center text-base font-semibold rounded-lg border-2
                                focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all
                                ${error
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-gray-200 bg-white focus:border-secondary'
                                }
                                ${isValidating ? 'opacity-50' : ''}
                            `}
                        />
                    ))}
                    {isValidating && (
                        <div className="ml-2">
                            <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {error && (
                    <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                    onClick={onImportClick}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors"
                    type="button"
                    aria-label="Import with recovery phrase"
                >
                    <FiKey size={12} />
                    Use recovery phrase
                </button>
            </div>
        );
    };

    const isCompleted = status === 'validated' || status === 'imported';

    return (
        <div
            className={`border rounded-xl transition-all duration-200 ${
                isCompleted
                    ? 'bg-tertiary/50 border-secondary/20 p-3'
                    : status === 'skipped'
                        ? 'bg-amber-50/50 border-amber-200/50 p-3.5'
                        : 'bg-white border-gray-200 hover:border-gray-300 p-3.5'
            }`}
            role="group"
            aria-label={`Account ${account.username}`}
        >
            <div className={`flex items-center gap-3 ${!isCompleted && status !== 'skipped' ? 'mb-2.5' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                        ? 'bg-secondary/10'
                        : status === 'skipped'
                            ? 'bg-amber-100'
                            : 'bg-gray-100'
                }`}>
                    {isCompleted ? (
                        <FiCheck size={16} className="text-secondary" />
                    ) : (
                        <FiUser
                            size={16}
                            className={status === 'skipped' ? 'text-amber-600' : 'text-gray-500'}
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-senary truncate">{account.username}</p>
                        {getStatusBadge()}
                    </div>
                    <p className="text-xs text-quinary truncate" title={account.did}>
                        {account.did ? `${account.did.slice(0, 8)}...${account.did.slice(-6)}` : 'No DID'}
                    </p>
                </div>
                {status === 'pending' && (
                    <button
                        onClick={handleSkipClick}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        type="button"
                        aria-label="Skip this account"
                    >
                        Skip
                    </button>
                )}
            </div>

            {renderContent()}
        </div>
    );
};

export default AccountMigrationCard;
