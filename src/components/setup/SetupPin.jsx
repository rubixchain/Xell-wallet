import { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { FiLock } from 'react-icons/fi';
import PinInput from './PinInput';
import Button from '../Button';
import { UserContext } from '../../context/userContext';

export default function SetupPin({ onSubmit, error }) {
  const { userDetails } = useContext(UserContext)
  const [pin, setPin] = useState(userDetails?.pin || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(pin);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-tertiary rounded-xl flex items-center justify-center">
          <FiLock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
            Create PIN
          </h1>
          <p className="text-quinary font-medium dark:text-gray-300">
            Choose a secure 6-digit PIN
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PinInput
          value={pin}
          onChange={setPin}
          length={6}
          error={error}
        />

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-600 dark:text-blue-200 mb-2">
            PIN Requirements:
          </h3>
          <ul className="text-sm font-medium text-blue-600 dark:text-blue-300 space-y-1">
            <li>• Use only numbers (0-9)</li>
            <li>• Avoid sequential numbers (e.g., 123456)</li>
            <li>• Don't use repeating digits (e.g., 111111)</li>
            <li>• Choose a PIN you haven't used elsewhere</li>
          </ul>
        </div>

        <Button
          type="submit"
          disabled={pin.length !== 6}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}