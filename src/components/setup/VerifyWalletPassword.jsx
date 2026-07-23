import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import PinInput from './PinInput';
import Button from '../Button';

export default function VerifyWalletPassword({ onSubmit, error, loader }) {
  const [pin, setPin] = useState('');

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
            Enter Wallet Password
          </h1>
          <p className="text-quinary font-medium dark:text-gray-300">
            Enter your existing wallet PIN to continue
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

        <div className="bg-tertiary border border-secondary/20 p-4 rounded-lg">
          <p className="text-sm font-medium text-senary">
            Use the same PIN you use to unlock your wallet. All accounts share a single password.
          </p>
        </div>

        <Button
          loader={loader}
          type="submit"
          disabled={pin.length !== 6}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}
