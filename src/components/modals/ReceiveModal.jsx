import { useContext, useState } from 'react';
import { FiArrowLeft, FiCopy, FiShare2 } from 'react-icons/fi';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';
import { UserContext } from '../../context/userContext';

export default function ReceiveModal({ isOpen, onClose, accountInfo }) {
  const { userDetails } = useContext(UserContext);
  const [copied, setCopied] = useState(false);
  let address = userDetails?.did;

  if (!isOpen) return null;

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard')
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'My RBT Address',
        text: address,
      });
    } catch (error) {
     
    }
  };

  return (
    <div
      className="fixed top-0 inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClickOutside}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 border-b-2 pb-3">
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-primary dark:text-white">
            Receive {userDetails?.tokenSymbol || "tokens"}
          </h2>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-4 shadow-xl rounded-lg">
            <QRCode
              value={userDetails?.did}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Address Display */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-senary dark:text-white">
            Your DID
          </h3>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg font-mono text-sm break-all">
              {userDetails?.did}
            </div>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiCopy className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleCopy}
            className="flex text-sm text-nowrap items-center justify-center space-x-2 bg-secondary hover:bg-secondary text-white font-semibold p-4 rounded-lg transition-colors"
          >
            <FiCopy className="w-5 h-5" />
            <span>Copy DID</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center rounded-lg text-sm text-quinary justify-center space-x-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-medium p-4rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <FiShare2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}