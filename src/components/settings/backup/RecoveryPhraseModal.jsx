import { useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiEye, FiEyeOff, FiDownload, FiPrinter, FiShield } from 'react-icons/fi';
import PinVerification from './PinVerification';
import { DUMMY_PHRASE } from '../../../utils/constants';
import { download } from '../../../utils/wallet';
import indexDBUtil from '../../../indexDB';
import { UserContext } from '../../../context/userContext';
import toast from 'react-hot-toast';

export default function RecoveryPhraseModal({ isOpen, onClose }) {
  const { userDetails } = useContext(UserContext)
  const [step, setStep] = useState('verify'); // verify, view
  const [isVisible, setIsVisible] = useState(false);
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

  const handlePinVerified = async() => {
    let decodeMnemonics = await indexDBUtil.getMnemonics("UserDetails", userDetails?.username, userDetails?.pin)    
    if (decodeMnemonics?.status) {
      const content = `Recovery Phrase:\n\n${decodeMnemonics?.mnemonics}\n\nIMPORTANT:\n- Keep this phrase secret and secure\n- Never share it with anyone\n- Store it offline\n- Make multiple backups\n- Don't tamper the file`;
          download(content, 'recovery-phrase.txt')
          toast.success("Mnemonics downloaded successfully")
          onClose()
          return
    }
    toast.error(decodeMnemonics?.message|| "failed to download mnemonics")
    onClose()
  };

  const handleDownload = async () => {

    let res = await indexDBUtil.getData('UserDetails', userDetails?.username)
    const lines = [
      `privatekey=${res.privatekey}`,
      `publickey=${res.publickey}`,
      `did=${res.did || ''}` // Include DID if it exists
    ];
    res = lines.join('\n');
    download(res, 'recoverykey.txt')

  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Recovery Phrase</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2rem;
              max-width: 800px;
              margin: 0 auto;
            }
            .warning { 
              color: #b91c1c;
              margin: 1.5rem 0;
              padding: 1rem;
              border: 1px solid #fecaca;
              border-radius: 0.5rem;
              background-color: #fee2e2;
            }
            .phrase { 
              font-family: monospace;
              font-size: 1.25rem;
              margin: 1.5rem 0;
              padding: 1.5rem;
              background-color: #f3f4f6;
              border-radius: 0.5rem;
              word-spacing: 0.5rem;
            }
          </style>
        </head>
        <body>
          <h1>Recovery Phrase</h1>
          <div class="warning">
            <strong>WARNING:</strong> Never share this phrase with anyone!
          </div>
          <div class="phrase">${DUMMY_PHRASE}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg"
      >
        <div className="p-6 space-y-6" ref={popupRef}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mnemonics
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'verify' ? (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PinVerification onVerified={handlePinVerified} />
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                    <FiShield className="w-5 h-5" />
                    <h3 className="font-semibold">Security Notice</h3>
                  </div>
                  <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    Never share your recovery phrase with anyone. Store it in a secure, offline location.
                  </p>
                </div>

                <div className="relative">
                  <div
                    className={`
                      bg-blue-50 dark:bg-gray-900 p-6 rounded-lg font-mono text-lg
                      ${isVisible ? 'text-gray-800 dark:text-gray-200' : 'text-transparent select-none'}
                      transition-colors
                    `}
                    style={{ textShadow: isVisible ? 'none' : '0 0 8px rgba(0,0,0,0.5)' }}
                  >
                    {DUMMY_PHRASE}
                  </div>
                  <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {isVisible ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    onClick={handleDownload}
                    className="flex items-center justify-center space-x-2 p-4 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiDownload className="w-5 h-5" />
                    <span>Download</span>
                  </motion.button>
                  <motion.button
                    onClick={handlePrint}
                    className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiPrinter className="w-5 h-5" />
                    <span>Print</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
