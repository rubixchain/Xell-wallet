import React, { useState } from 'react';
import { FiLock, FiArrowLeft, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi';

const SetUnifiedPasswordStep = ({ onSubmit, onBack, isProcessing }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [errors, setErrors] = useState({});

    const validatePin = (value) => {
        if (value.length < 6) {
            return 'PIN must be 6 digits';
        }
        if (!/^\d{6}$/.test(value)) {
            return 'PIN must contain only numbers';
        }
        return null;
    };

    const handlePinChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setPin(value);
        setErrors(prev => ({ ...prev, pin: null }));
    };

    const handleConfirmPinChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setConfirmPin(value);
        setErrors(prev => ({ ...prev, confirmPin: null }));
    };

    const handleSubmit = () => {
        const newErrors = {};

        // Validate PIN
        const pinError = validatePin(pin);
        if (pinError) {
            newErrors.pin = pinError;
        }

        // Validate confirm PIN
        if (confirmPin !== pin) {
            newErrors.confirmPin = 'PINs do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(pin);
    };

    const isValid = pin.length === 6 && confirmPin === pin;

    // PIN strength indicator
    const getPinStrength = () => {
        if (pin.length === 0) return { label: '', color: 'bg-gray-200' };
        if (pin.length < 6) return { label: 'Too short', color: 'bg-red-400' };

        // Check for common patterns
        const isSequential = '0123456789'.includes(pin) || '9876543210'.includes(pin);
        const isRepeating = /^(\d)\1{5}$/.test(pin);

        if (isSequential || isRepeating) {
            return { label: 'Weak', color: 'bg-orange-400' };
        }

        return { label: 'Good', color: 'bg-green-500' };
    };

    const strength = getPinStrength();

    return (
        <div className="flex flex-col h-full">
            {/* Back button */}
            <button
                onClick={onBack}
                disabled={isProcessing}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 mb-4 disabled:opacity-50"
            >
                <FiArrowLeft size={18} />
                <span className="text-sm">Back</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-3 rounded-xl">
                    <FiLock className="text-green-600" size={24} />
                </div>
                <div>
                    <h2 className="font-semibold text-xl text-senary">Set Unified Password</h2>
                    <p className="text-quinary text-sm">This will unlock all your accounts</p>
                </div>
            </div>

            {/* Info box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-green-800">
                    Create a new 6-digit PIN that will be used to unlock all your accounts.
                    Make sure to remember this PIN as it cannot be recovered.
                </p>
            </div>

            {/* PIN Input */}
            <div className="space-y-4 flex-1">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        New PIN
                    </label>
                    <div className="relative">
                        <input
                            type={showPin ? 'text' : 'password'}
                            value={pin}
                            onChange={handlePinChange}
                            placeholder="Enter 6-digit PIN"
                            className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 text-lg tracking-widest ${
                                errors.pin
                                    ? 'border-red-300 focus:ring-red-200'
                                    : 'border-gray-200 focus:ring-primary/20'
                            }`}
                            maxLength={6}
                            disabled={isProcessing}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPin ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                    </div>
                    {errors.pin && (
                        <p className="text-red-500 text-xs mt-1">{errors.pin}</p>
                    )}
                    {/* Strength indicator */}
                    {pin.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${strength.color} transition-all`}
                                    style={{ width: `${(pin.length / 6) * 100}%` }}
                                />
                            </div>
                            <span className={`text-xs ${
                                strength.label === 'Good' ? 'text-green-600' :
                                    strength.label === 'Weak' ? 'text-orange-600' : 'text-red-600'
                            }`}>
                                {strength.label}
                            </span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm PIN
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPin ? 'text' : 'password'}
                            value={confirmPin}
                            onChange={handleConfirmPinChange}
                            placeholder="Re-enter PIN"
                            className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 text-lg tracking-widest ${
                                errors.confirmPin
                                    ? 'border-red-300 focus:ring-red-200'
                                    : confirmPin.length === 6 && confirmPin === pin
                                        ? 'border-green-300 focus:ring-green-200'
                                        : 'border-gray-200 focus:ring-primary/20'
                            }`}
                            maxLength={6}
                            disabled={isProcessing}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPin(!showConfirmPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirmPin ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                        {confirmPin.length === 6 && confirmPin === pin && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                <FiCheck className="text-green-500" size={20} />
                            </div>
                        )}
                    </div>
                    {errors.confirmPin && (
                        <p className="text-red-500 text-xs mt-1">{errors.confirmPin}</p>
                    )}
                </div>
            </div>

            {/* Submit button */}
            <button
                onClick={handleSubmit}
                disabled={!isValid || isProcessing}
                className="w-full bg-primary hover:bg-secondary text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
            >
                {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        Processing...
                    </span>
                ) : (
                    'Set Unified Password'
                )}
            </button>
        </div>
    );
};

export default SetUnifiedPasswordStep;
