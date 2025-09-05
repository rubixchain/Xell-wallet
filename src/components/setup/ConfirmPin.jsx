import { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { FiLock } from 'react-icons/fi';
import PinInput from './PinInput';
import Button from '../Button';
import { UserContext } from '../../context/userContext';

export default function ConfirmPin({ onSubmit, error, loader }) {
  const { userDetails } = useContext(UserContext)
  const [pin, setPin] = useState(userDetails?.confirmPin || '');

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
            Confirm PIN
          </h1>
          <p className="text-quinary font-medium dark:text-gray-300">
            Re-enter your PIN to confirm
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

        <Button
          loader={loader}
          type="submit"
          disabled={pin.length !== 6}
        >
          Complete Setup
        </Button>
      </form>
    </div>
  );
}