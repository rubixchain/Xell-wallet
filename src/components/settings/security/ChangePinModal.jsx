import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLock } from 'react-icons/fi';
import PinInput from '../../setup/PinInput';
import { validatePin } from '../../../utils/validation';
import { useContext } from 'react';
import { UserContext } from '../../../context/userContext';
import indexDBUtil from '../../../indexDB';
import toast from 'react-hot-toast';

export default function ChangePinModal({ isOpen, onClose }) {
  const { userDetails, setUserDetails } = useContext(UserContext)
  const [step, setStep] = useState('current'); // current, new, confirm
  const [pins, setPins] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [error, setError] = useState('');
  const popupRef = useRef(null)


  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [])

  // const onClickChangeTimer = (value) => {
  //   localStorage.setItem("logginTimeOut", JSON.stringify(value))
  //   setAutoLockTime(value);
  //   setIsDropdownOpen(false);

  // }

  const handlePinChange = (type, value) => {
    setPins(prev => ({ ...prev, [type]: value }));
    setError('');
  };

  const updateUserPin = async (newPin, pk) => {
    try {
      let res = await indexDBUtil.updatePassword("UserDetails", userDetails?.username, pk, pins.current, newPin)
      if (!res || !res?.status) {
        toast.error('failed to update pin')
        return
      }
      toast.success(res?.message)
      setUserDetails(prev => ({ ...prev, pin: newPin }))

      setPins({
        current: '',
        new: '',
        confirm: ''
      })
      setStep('current')
      setError('')
      onClose()
    }
    catch (e) {
      toast.error('failed to update pin')
    }

  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 'current') {
      // In a real app, verify current PIN against stored (hashed) value

      if (pins.current === userDetails?.pin) { // Demo validation

        setStep('new');
      } else {
        setError('Incorrect PIN');
      }
    } else if (step === 'new') {
      if (!validatePin(pins.new)) {
        setError('Please choose a more secure PIN');
        return;
      }
      if (pins.new == userDetails?.pin) {
        setError('Please choose different PIN');
        return;
      }
      setStep('confirm');
    } else if (step === 'confirm') {
      if (pins.new !== pins.confirm) {
        setError('PINs do not match');
        return;
      }

      try {
        let decodePk = await indexDBUtil.getData("UserDetails", userDetails?.username, pins.current)
        if (decodePk?.status) {
          updateUserPin(pins.new, decodePk?.privatekey);
        }

      } catch (error) {
        setError('Failed to update PIN. Please try again.');
      }
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'current': return 'Enter Current PIN';
      case 'new': return 'Enter New PIN';
      case 'confirm': return 'Confirm New PIN';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md"

      >
        <div className="p-6 space-y-6" ref={popupRef}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FiLock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {getStepTitle()}
              </h2>
            </div>
            <button
              onClick={() => {
                setPins({
                  current: '',
                  new: '',
                  confirm: ''
                })
                setStep('current')
                setError('')
                onClose()
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PinInput
                  value={pins[step]}
                  onChange={(value) => handlePinChange(step, value)}
                  length={6}
                  error={error}
                />
              </motion.div>
            </AnimatePresence>

            {step === 'new' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  PIN Requirements:
                </h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Use only numbers (0-9)</li>
                  <li>• Avoid sequential numbers (e.g., 123456)</li>
                  <li>• Don't use repeating digits (e.g., 111111)</li>
                  <li>• Choose a PIN you haven't used elsewhere</li>
                </ul>
              </div>
            )}

            <motion.button
              type="submit"
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50"
              disabled={pins[step].length !== 6}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {step === 'confirm' ? 'Update PIN' : 'Continue'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}