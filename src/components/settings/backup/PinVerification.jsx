import { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { FiLock } from 'react-icons/fi';
import PinInput from '../../setup/PinInput';
import { UserContext } from '../../../context/userContext';

export default function PinVerification({ onVerified }) {
  const { userDetails } = useContext(UserContext)
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loader, setLoader] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userDetails?.pin == pin) {
      onVerified();
    } else {
      setError('Invalid PIN. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <FiLock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Enter PIN
          </h3>
          <p className="text-sm text-gray-500">
            Verify your PIN to download Mnemonics
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <PinInput
          value={pin}
          onChange={(value) => {
            setError('')
            setPin(value)
          }}
          length={6}
          error={error}
        />

        <motion.button
          type="submit"
          className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50"
          disabled={pin.length !== 6}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* <div class="flex items-center justify-center ">
            <div class="loader border-t-4 border-b-4 border-blue-500 rounded-full w-16 h-16 animate-spin"></div>
          </div> */}
          Continue
        </motion.button>
      </form>
    </div>
  );
}