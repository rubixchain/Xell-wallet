import { useContext, useEffect, useState, useRef } from 'react';
import { FiArrowLeft, FiSend, FiStar, FiPlus, FiX, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';
import toast from 'react-hot-toast';
import { END_POINTS } from '../../api/endpoints';
import { UserContext } from '../../context/userContext';
import { generateSignature, isSignatureRoundRequired } from '../../utils';
import indexDBUtil from '../../indexDB';
import { NETWORK_TYPES } from '../../../config';
import TransactionConfirmationModal from './TransactionConfirmationModal';

const typesArray = ["Type 1", "Type 2"]


export default function SendModal({ isOpen, onClose, accountInfo, setIsTransactionCompleted }) {
  const { userDetails, selectedTokens } = useContext(UserContext)
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showSaveToFavorites, setShowSaveToFavorites] = useState(false);
  const availableBalance = '372.6619 RBT';
  const [type, setType] = useState('Type 2')
  const [loader, setLoader] = useState(false)
  const [comments, setComments] = useState('')
  const [selectedToken, setSelectedToken] = useState(null)
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)
  const [tokenSearchQuery, setTokenSearchQuery] = useState('')
  const dropdownRef = useRef(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [transactionData, setTransactionData] = useState(null)
  const [amountError, setAmountError] = useState('')

  useEffect(() => {
    let fav = localStorage.getItem(userDetails?.username)
    fav = JSON.parse(fav)
    if (!fav) {
      return
    }
    setFavorites(fav)
  }, [])


  useEffect(() => {
    function handleClickOutside(event) {
      if (showTokenDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTokenDropdown(false);
        setTokenSearchQuery('');
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTokenDropdown]);

  useEffect(() => {
    if (!userDetails?.tokenSymbol && selectedTokens && selectedTokens.length > 0) {
      const tokensWithRBT = [
        {
          symbol: 'RBT',
          name: 'RBT',
          balance: accountInfo?.rbt_amount || '0',
          ft_name: 'RBT'
        },
        ...selectedTokens.map(token => ({
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          ft_name: token.symbol
        }))
      ];

      setSelectedToken(tokensWithRBT[0]);
    }
  }, [userDetails?.tokenSymbol, selectedTokens, accountInfo?.rbt_amount]);

  const getAvailableTokens = () => {
    if (!userDetails?.tokenSymbol && selectedTokens && selectedTokens.length > 0) {
      return [
        {
          ft_count: accountInfo?.rbt_amount || '0',
          ft_name: 'RBT'
        },
        ...selectedTokens.map(token => ({

          ft_count: token.ft_count,
          ft_name: token.ft_name
        }))
      ];
    }
    return [];
  };

  const availableTokens = getAvailableTokens();


  const filteredTokens = availableTokens.filter(token =>
    token.ft_name?.toLowerCase().includes(tokenSearchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget && !loader) {
      setLoader(false)
      setAmount('')
      setRecipientAddress('')
      setRecipientName('')
      setComments('')
      setSelectedToken(null)
      onClose();
    }
  };

  const handleSelectFavorite = (favorite) => {
    setRecipientAddress(favorite.address);
    setRecipientName(favorite.name);
  };

  const handleAddFavorite = () => {
    if (recipientAddress && recipientName) {
      let recipient = favorites?.find(user => user?.name == recipientName || user?.address == recipientAddress)
      if (recipient) {
        toast.error('Recipient already exists')
        return
      }
      const newFavorite = {
        id: Date.now().toString(),
        name: recipientName,
        address: recipientAddress,
      };
      let res = [...favorites, newFavorite]
      localStorage.setItem(userDetails?.username, JSON.stringify(res))
      setFavorites(res);
      setShowSaveToFavorites(false);
      setRecipientName('')
    }
  };

  const handleRemoveFavorite = (id) => {
    let res = favorites.filter(f => f.id !== id)
    localStorage.setItem(userDetails?.username, JSON.stringify(res))
    setFavorites(res);
  };

  const getCurrentTokenInfo = () => {
    if (userDetails?.network == 1 || userDetails?.network == 2) {
      return {
        symbol: 'RBT',
        balance: accountInfo?.rbt_amount || '0'
      };
    } else {
      return {
        symbol: userDetails.tokenSymbol,
        balance: accountInfo?.ft_count || '0'
      };
    }
  };

  const currentTokenInfo = getCurrentTokenInfo();

  async function generateSignatureApi(id, hash, pk) {
    try {
      let signature = await generateSignature(pk, hash)
      let signatureResponse = await END_POINTS.signature_response({
        id: id,
        Signature: { Signature: signature },
        mode: 4
      })

      if (!signatureResponse || !signatureResponse?.status) {
        setLoader(false)
        toast.error(signatureResponse?.message || 'failed to do response')
        return
      }
      else if (isSignatureRoundRequired(signatureResponse?.result)) {
        return await generateSignatureApi(signatureResponse.result.id, signatureResponse.result.hash, pk)
      }
      else {
        toast.success(signatureResponse?.message || 'Token transferred successfully')
        setLoader(false)
        setAmount('')
        setComments('')
        setRecipientAddress('')
        setRecipientName('')
        setSelectedToken(null)
        setIsTransactionCompleted(prev => !prev)
        onClose();
      }
    }
    catch (e) {
     
      setLoader(false)
    }
  }

  const onClickSendToken = async (e) => {
    e?.preventDefault()
    if (!amount) {
      return toast.error('Please enter amount')
    }
    if (!recipientAddress) {
      return toast.error('Please enter recipient address')
    }

    const txData = {
      amount,
      recipientAddress,
      recipientName,
      comments,
      selectedToken
    };
    
    setTransactionData(txData);
    setShowConfirmation(true);
  }

  const executeTransaction = async () => {
    setLoader(true)

    try {
      const isRBT = (userDetails?.network == 1 || userDetails?.network == 2);

      if (isRBT) {
        let data = {
          comment: comments,
          receiver: recipientAddress,
          sender: accountInfo?.did,
          tokenCOunt: parseFloat(amount),
          type: 2
        }
        let transferRBT = await END_POINTS.transfer_rtbt(data)
        if (!transferRBT || !transferRBT?.status) {
          toast.error(transferRBT?.message || 'Failed to transfer RBT')
          setLoader(false)
          return
        }
        let getPrivateKey = await indexDBUtil.getData("UserDetails", userDetails?.username, userDetails?.pin)
        if (getPrivateKey?.status) {
          await generateSignatureApi(transferRBT?.result?.id, transferRBT?.result?.hash, getPrivateKey?.privatekey)
        }
        else {
          toast.error(getPrivateKey?.message || 'transaction initiation failed')
          setLoader(false)
        }
      } else {
        let data = {
          comment: comments,
          creatorDID: accountInfo?.creator_did,
          ft_count: parseFloat(amount),
          ft_name: accountInfo.ft_name,
          password: "",
          quorum_type: 2,
          receiver: recipientAddress,
          sender: userDetails?.did
        }
        let transferFT = await END_POINTS.initiate_ft_transfer(data)
        if (!transferFT || !transferFT?.status) {
          toast.error(transferFT?.message || 'Failed to transfer tokens')
          setLoader(false)
          return
        }
        let getPrivateKey = await indexDBUtil.getData("UserDetails", userDetails?.username, userDetails?.pin)
        if (getPrivateKey?.status) {
          await generateSignatureApi(transferFT?.result?.id, transferFT?.result?.hash, getPrivateKey?.privatekey)
        }
        else {
          toast.error(getPrivateKey?.message || 'transaction initiation failed')
          setLoader(false)
        }
      }
    }
    catch (e) {
      
      toast.error('Transfer failed')
      setLoader(false)
    }
  }

  const handleConfirmTransaction = () => {
    setShowConfirmation(false);
    executeTransaction();
  };

  const handleRejectTransaction = () => {
    setShowConfirmation(false);
    setTransactionData(null);
  };

  const handleAmountChangeFromConfirmation = (newAmount) => {
    setAmount(newAmount);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClickOutside}
    >
      <motion.div
        className="overflow-auto w-full max-w-md max-h-[95vh] bg-white dark:bg-gray-800 rounded-2xl p-6 space-y-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onMouseDown={(e) => e?.stopPropagation()}
      >
        <div className="flex items-center space-x-4 z-100 border-b-2 pb-3">
          <button
            onClick={() => {
              if (loader) {
                return
              }
              setAmount('')
              setComments('')
              setRecipientAddress('')
              setRecipientName('')
              setSelectedToken(null)
              onClose();
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-senary dark:text-white">
            Send {userDetails?.tokenSymbol}
          </h2 >
        </div >

        <form onSubmit={handleSubmit} className="space-y-6">

          {favorites.length > 0 && (
            <div className="space-y-2">
              <label className="block font-semibold text-black dark:text-gray-300">
                Select from Favorites
              </label>
              <div className="flex flex-wrap gap-2">
                {favorites.map((favorite) => (
                  <motion.button
                    disabled={loader}
                    key={favorite.id}
                    type="button"
                    onClick={() => handleSelectFavorite(favorite)}
                    className={`
                      group flex items-center text-base font-semibold space-x-2 px-3 py-2 rounded-lg
                      ${recipientAddress === favorite.address
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiStar className="w-4 h-4 text-yellow-500" />
                    <span>{favorite.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(favorite.id);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                Transaction Amount
              </label>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Balance: {currentTokenInfo.balance} {currentTokenInfo.symbol}
              </span>
            </div>
            <div className="relative">
              <input
                disabled={loader}
                onWheel={(e) => e.target.blur()}
                type="number"
                value={amount}
                onChange={(e) => {
                  let value = e.target.value
                  setAmountError('')

                  const regex = /^\d*\.?\d{0,3}$/;

                  if (!value) {
                    setAmount(value);
                    return
                  }

                  if (!regex.test(value)) {
                    setAmountError('Invalid amount format');
                    return
                  }

                  const numValue = parseFloat(value);
                  
                  if (numValue > parseFloat(currentTokenInfo.balance)) {
                    setAmountError(`Amount exceeds available balance of ${currentTokenInfo.balance} ${currentTokenInfo.symbol}`);
                    return
                  }

                  if (numValue >= 0) {
                    setAmount(value);
                  }
                }}
                placeholder="0.00"
                className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
              {amountError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-600 dark:text-red-400"
                >
                  {amountError}
                </motion.p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Recipient Address
            </label>
            <div className="relative">
              <input
                disabled={loader}
                type="text"
                value={recipientAddress}
                onChange={(e) => {
                  setRecipientAddress(e.target.value)
                  setRecipientName('')
                  if (!e.target.value) {
                    setShowSaveToFavorites(false)
                  }
                }}
                placeholder="Enter recipient's address"
                className="w-full p-4 bg-gray-50 text-sm dark:bg-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {recipientAddress && !recipientName && !showSaveToFavorites && (
              <motion.button
                disabled={loader}
                type="button"
                onClick={() => setShowSaveToFavorites(true)}
                className="flex items-center space-x-2 text-primary hover:text-primary-light text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className='flex items-center text-lg text-[#118902]'>
                  <FiStar className="w-5 h-5 mr-1" />
                  <span className='font-semibold text-sm'>Save to Favorites</span>
                </div>
              </motion.button>
            )}
          </div>

          < AnimatePresence >
            {showSaveToFavorites && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter name for this address"
                  className="w-full text-sm p-4 bg-gray-50 dark:bg-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowSaveToFavorites(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddFavorite}
                    disabled={!recipientName || !recipientAddress}
                  >
                    Save
                  </Button>
                </div>
              </motion.div>
            )
            }
          </AnimatePresence >

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Comment / Memo
            </label>
            <div className="relative">
              <input
                disabled={loader}
                type="text"
                value={comments}
                onChange={(e) => {
                  setComments(e?.target.value);
                }}
                placeholder="Add your comments"
                className="text-sm w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            disabled={loader || !recipientAddress || !amount || amountError || (!userDetails?.tokenSymbol && !selectedToken)}
            onClick={(e) => onClickSendToken(e)}
            type="submit"
            className="w-full bg-secondary hover:bg-secondary text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {
              loader ? (
                <div className="flex justify-center items-center">
                  <div className="loader border-t-transparent text-sm border-solid border-2 border-white-500 rounded-full animate-spin w-6 h-6"></div>
                </div>
              ) : (
                <>
                  <FiSend className="w-5 h-5" />
                  <span>Send {currentTokenInfo.symbol}</span>
                </>
              )
            }
          </button >
        </form >
      </motion.div >

      <TransactionConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmTransaction}
        onReject={handleRejectTransaction}
        transactionData={transactionData}
        isLoading={loader}
        onAmountChange={handleAmountChangeFromConfirmation}
      />
    </div >
  );
}