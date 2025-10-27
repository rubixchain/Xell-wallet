import { useState, useRef, useEffect } from 'react';
import { FiXCircle, FiCopy, FiPlus, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../routes/routes';

export default function AccountSelectorModal({ 
  isOpen, 
  onClose, 
  accounts, 
  currentAccount, 
  onAccountSelect,
  onCreateWallet,
  onImportWallet 
}) {
  const navigate = useNavigate();
  const modalRef = useRef(null);

  const handleCopyDID = async (did) => {
    try {
      await navigator.clipboard.writeText(did);
      toast.success('DID copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy DID');
    }
  };

  const handleAccountClick = (account) => {
    onAccountSelect(account);
    onClose();
  };

  const handleCreateWallet = () => {
    onClose();
    onCreateWallet();
  };

  const handleImportWallet = () => {
    onClose();
    onImportWallet();
  };

 
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 p-4 bg-black bg-opacity-75 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg w-96 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Select Account</h2>
            <p className="text-sm text-gray-500 mt-1">Choose an account or create a new one</p>
          </div>
          <button className="text-gray-500" onClick={onClose}>
            <FiXCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {accounts && accounts.length > 0 ? (
              accounts.map((account) => (
                <div
                  key={account.username}
                  onClick={() => handleAccountClick(account)}
                  className={`flex py-3 items-center justify-between p-2 rounded cursor-pointer relative hover:bg-gray-100 ${
                    account.username === currentAccount?.username 
                      ? 'bg-tertiary bg-opacity-90 text-gray-900' 
                      : 'text-gray-900'
                  }`}
                >
                  <div className="flex text-base items-center">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{account.username}</span>
                        {account.username === currentAccount?.username && (
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {account.did ? `${account.did.slice(0, 5)}....${account.did.slice(-5)}` : 'No DID'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDID(account.did);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <FiCopy className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No accounts found
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-2">
            <button
              onClick={handleCreateWallet}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-primary text-primary hover:bg-primary/5 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              <span className="font-medium">Create Wallet</span>
            </button>
            <button
              onClick={handleImportWallet}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              <span className="font-medium">Import Wallet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
