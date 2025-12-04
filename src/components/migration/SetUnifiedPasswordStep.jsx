import React, { useState } from 'react';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import PinInput from '../setup/PinInput';
import Button from '../Button';

const SetUnifiedPasswordStep = ({ onSubmit, onBack, isProcessing }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [errors, setErrors] = useState({});

    // Check if PIN has sequential numbers (e.g., 123456, 654321)
    const hasSequentialNumbers = (value) => {
        if (value.length !== 6) return false;

        // Check ascending sequence
        let isAscending = true;
        for (let i = 0; i < value.length - 1; i++) {
            if (parseInt(value[i]) + 1 !== parseInt(value[i + 1])) {
                isAscending = false;
                break;
            }
        }

        // Check descending sequence
        let isDescending = true;
        for (let i = 0; i < value.length - 1; i++) {
            if (parseInt(value[i]) - 1 !== parseInt(value[i + 1])) {
                isDescending = false;
                break;
            }
        }

        return isAscending || isDescending;
    };

    // Check if PIN has repeating digits (e.g., 111111, 222222)
    const hasRepeatingDigits = (value) => {
        if (value.length !== 6) return false;
        return value.split('').every(digit => digit === value[0]);
    };

    // Check if PIN meets requirements
    const isPinWeak = (value) => {
        if (value.length !== 6) return false;
        return hasSequentialNumbers(value) || hasRepeatingDigits(value);
    };

    const handleSubmit = () => {
        const newErrors = {};

        if (pin.length !== 6) {
            newErrors.pin = 'PIN must be 6 digits';
        } else if (isPinWeak(pin)) {
            newErrors.pin = 'PIN does not meet security requirements';
        }

        if (confirmPin.length !== 6) {
            newErrors.confirmPin = 'PIN must be 6 digits';
        } else if (confirmPin !== pin) {
            newErrors.confirmPin = 'PINs do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onSubmit(pin);
    };

    const handlePinChange = (value) => {
        setPin(value);
        setErrors(prev => ({ ...prev, pin: null }));
    };

    const handleConfirmPinChange = (value) => {
        setConfirmPin(value);
        setErrors(prev => ({ ...prev, confirmPin: null }));
    };

    const isValid = pin.length === 6 && confirmPin.length === 6 && confirmPin === pin && !isPinWeak(pin);

    return (
        <div className="flex flex-col h-full pt-4 pb-6">
            {/* Back button */}
            <button
                onClick={onBack}
                disabled={isProcessing}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 mb-4 disabled:opacity-50"
            >
                <FiArrowLeft size={18} />
                <span className="text-sm">Back</span>
            </button>

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-tertiary rounded-xl flex items-center justify-center">
                        <FiLock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-[22px] font-bold text-senary">
                            Set Unified Password
                        </h1>
                        <p className="text-quinary font-medium">
                            This will unlock all your accounts
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* New PIN */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New PIN
                        </label>
                        <PinInput
                            value={pin}
                            onChange={handlePinChange}
                            length={6}
                            error={errors.pin || (pin.length === 6 && isPinWeak(pin) ? 'Weak PIN' : null)}
                        />
                    </div>

                    {/* Confirm PIN */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm PIN
                        </label>
                        <PinInput
                            value={confirmPin}
                            onChange={handleConfirmPinChange}
                            length={6}
                            error={errors.confirmPin}
                        />
                    </div>

                    {/* PIN Requirements */}
                    <div className="bg-tertiary border border-secondary/20 p-4 rounded-lg">
                        <h3 className="font-semibold text-secondary mb-2">
                            PIN Requirements:
                        </h3>
                        <ul className="text-sm font-medium text-senary space-y-1">
                            <li>• Use only numbers (0-9)</li>
                            <li>• Avoid sequential numbers (e.g., 123456)</li>
                            <li>• Don't use repeating digits (e.g., 111111)</li>
                            <li>• Choose a PIN you haven't used elsewhere</li>
                        </ul>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!isValid || isProcessing}
                        loader={isProcessing}
                    >
                        Set Unified Password
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SetUnifiedPasswordStep;
