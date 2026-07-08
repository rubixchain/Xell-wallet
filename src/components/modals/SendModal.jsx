import { useContext, useEffect, useState } from 'react';
import { FiArrowLeft, FiSend, FiStar, FiPlus, FiX, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../Button';
import toast from 'react-hot-toast';
import { END_POINTS } from '../../api/endpoints';
import { UserContext } from '../../context/userContext';
import { generateSignature } from '../../utils';
import indexDBUtil from '../../indexDB';
import { FAVORITES_KEY, favoritesKey } from '../../hooks/useFavorites';
import { getSkipConfirm, setSkipConfirm as persistSkipConfirm } from '../../utils/sendPrefs';

// A single empty asset row. `assetId` is the chosen asset's id ('RBT' or an
// FT name); empty means "not yet selected".
const makeRow = (assetId = '') => ({ assetId, amount: '' });

export default function SendModal({ isOpen, onClose, accountInfo, setIsTransactionCompleted }) {
  const { userDetails, selectedTokens } = useContext(UserContext)
  // Multi-asset: each row is one asset + amount. Default to a single RBT row.
  const [rows, setRows] = useState([makeRow('RBT')]);
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showSaveToFavorites, setShowSaveToFavorites] = useState(false);
  const [loader, setLoader] = useState(false)
  const [comments, setComments] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [skipConfirm, setSkipConfirm] = useState(false)

  // The full asset universe for this account: native RBT plus every owned FT.
  // RBT has no creatorDID; FTs carry the creator_did needed in the tx payload.
  const assets = [
    {
      id: 'RBT',
      name: 'RBT',
      balance: parseFloat(accountInfo?.balance) || 0,
      creatorDID: null,
      isRBT: true,
    },
    ...(selectedTokens || []).map((t) => ({
      id: t.ft_name,
      name: t.ft_name,
      balance: parseFloat(t.ft_count) || 0,
      creatorDID: t.creator_did,
      isRBT: false,
    })),
  ];

  const findAsset = (id) => assets.find((a) => a.id === id) || null;

  useEffect(() => {
    // Favourites are scoped per account (by DID). Seed this account's list from
    // the legacy global list the first time so existing favourites aren't lost.
    const did = userDetails?.did
    if (!did) { setFavorites([]); return }
    const storageKey = favoritesKey(did)

    let stored = localStorage.getItem(storageKey)
    if (stored == null) {
      const legacy = localStorage.getItem(FAVORITES_KEY)
      if (legacy != null) {
        localStorage.setItem(storageKey, legacy)
        stored = legacy
      }
    }
    try { setFavorites(stored ? JSON.parse(stored) : []) } catch { setFavorites([]) }
  }, [userDetails?.did])

  useEffect(() => {
    // Load the skip-confirmation preference for the active account (seeds from
    // the legacy global value the first time). Re-reads when the modal opens so
    // a change made in Settings takes effect immediately.
    setSkipConfirm(getSkipConfirm(userDetails?.did))
  }, [userDetails?.did, isOpen])

  // Close any open asset dropdown when clicking outside of it.
  useEffect(() => {
    function handleClickOutside(event) {
      if (openRowIndex !== null && !event.target.closest('[data-asset-dropdown]')) {
        setOpenRowIndex(null);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openRowIndex]);

  if (!isOpen) return null;

  // Assets still available to a given row = those not chosen in any OTHER row
  // (constraint #4: an asset can't be picked twice), plus this row's own pick.
  const availableAssetsForRow = (rowIndex) => {
    const takenElsewhere = new Set(
      rows.filter((_, i) => i !== rowIndex).map((r) => r.assetId).filter(Boolean)
    );
    return assets.filter((a) => !takenElsewhere.has(a.id));
  };

  const canAddRow = rows.length < assets.length;

  const resetForm = () => {
    setRows([makeRow('RBT')])
    setComments('')
    setRecipientAddress('')
    setRecipientName('')
    setShowSaveToFavorites(false)
    setOpenRowIndex(null)
  }

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget && !loader) {
      setLoader(false)
      resetForm()
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
        createdAt: new Date().toISOString(),
      };
      let res = [...favorites, newFavorite]
      localStorage.setItem(favoritesKey(userDetails?.did), JSON.stringify(res))
      setFavorites(res);
      setShowSaveToFavorites(false);
      setRecipientName('')
    }
  };

  const handleRemoveFavorite = (id) => {
    let res = favorites.filter(f => f.id !== id)
    localStorage.setItem(favoritesKey(userDetails?.did), JSON.stringify(res))
    setFavorites(res);
  };

  // --- Asset row handlers ---------------------------------------------------
  const handleSelectAsset = (rowIndex, assetId) => {
    setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, assetId, amount: '' } : r)));
    setOpenRowIndex(null);
  };

  const handleAmountChange = (rowIndex, value) => {
    const asset = findAsset(rows[rowIndex].assetId);
    const max = asset ? asset.balance : 0;
    // Allow up to 3 decimal places and never exceed the asset's balance.
    const regex = /^\d*\.?\d{0,3}$/;
    if (value === '') {
      setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, amount: '' } : r)));
      return;
    }
    if (regex.test(value) && parseFloat(value) >= 0 && parseFloat(value) <= max) {
      setRows((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, amount: value } : r)));
    }
  };

  const handleAddRow = () => {
    if (!canAddRow) return;
    // Default the new row to the first asset not already used.
    const used = new Set(rows.map((r) => r.assetId).filter(Boolean));
    const next = assets.find((a) => !used.has(a.id));
    setRows((prev) => [...prev, makeRow(next ? next.id : '')]);
  };

  const handleRemoveRow = (rowIndex) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIndex));
    setOpenRowIndex(null);
  };

  // --- Validation -----------------------------------------------------------
  const rowIsValid = (row) => {
    const asset = findAsset(row.assetId);
    if (!asset) return false;
    const amt = parseFloat(row.amount);
    return amt > 0 && amt <= asset.balance;
  };

  const hasDuplicateAssets = () => {
    const ids = rows.map((r) => r.assetId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  };

  const allRowsValid = rows.length > 0 && rows.every(rowIsValid) && !hasDuplicateAssets();
  const canSend = allRowsValid && !!recipientAddress;

  async function generateSignatureApi(id, hash, pk) {
    try {
      let signature = await generateSignature(pk, hash)
      let signatureResponse = await END_POINTS.signature_response({
        id: id,
        signature: signature
      })

      if (!signatureResponse || !signatureResponse?.status) {
        setLoader(false)
        toast.error(signatureResponse?.message || 'failed to do response')
        return
      }
      else if (signatureResponse?.result && signatureResponse?.result?.id && signatureResponse?.result?.hash) {
        return await generateSignatureApi(signatureResponse?.result?.id, signatureResponse?.result?.hash, pk)
      }
      else {
        toast.success('Tokens transferred successfully')
        setLoader(false)
        resetForm()
        setIsTransactionCompleted(prev => !prev)
        onClose();
      }
    }
    catch (e) {
      setLoader(false)
    }
  }

  // Validate then either show the confirmation step or send directly (when the
  // user has opted to skip confirmation).
  const handleSendClick = (e) => {
    e?.preventDefault()
    if (hasDuplicateAssets()) {
      return toast.error('Each asset can only be selected once')
    }
    if (!rows.every(rowIsValid)) {
      return toast.error('Enter a valid amount for every asset (within its balance)')
    }
    if (!recipientAddress) {
      return toast.error('Please enter recipient address')
    }
    if (skipConfirm) {
      executeSend()
    } else {
      setShowConfirm(true)
    }
  }

  const handleToggleSkipConfirm = () => {
    const next = !skipConfirm
    setSkipConfirm(next)
    persistSkipConfirm(userDetails?.did, next)
  }

  const resetAndClose = () => {
    if (loader) return
    setShowConfirm(false)
    resetForm()
    onClose()
  }

  // Build the combined `tokens` payload from the asset rows. RBT goes under
  // `rbt`; every FT row is collected into the `ft` array. Keys are only
  // included when present, matching the single-asset payloads the node already
  // accepts.
  const buildTokens = () => {
    const tokens = {};
    const rbtRow = rows.find((r) => findAsset(r.assetId)?.isRBT);
    if (rbtRow) {
      tokens.rbt = parseFloat(rbtRow.amount);
    }
    const ftRows = rows.filter((r) => {
      const a = findAsset(r.assetId);
      return a && !a.isRBT;
    });
    if (ftRows.length > 0) {
      tokens.ft = ftRows.map((r) => {
        const a = findAsset(r.assetId);
        return {
          ftName: a.name,
          creatorDID: a.creatorDID,
          numberOfFts: parseFloat(r.amount),
        };
      });
    }
    return tokens;
  };

  const executeSend = async () => {
    setLoader(true)
    try {
      const data = {
        initiator: userDetails?.did,
        owner: recipientAddress,
        tokens: buildTokens(),
        memo: comments || ''
      }
      let transfer = await END_POINTS.initiate_transfer(data)
      if (!transfer || !transfer?.status) {
        toast.error(transfer?.message || 'Failed to transfer tokens')
        setLoader(false)
        return
      }
      let getPrivateKey = await indexDBUtil.getData("UserDetails", userDetails?.username, userDetails?.pin)
      if (getPrivateKey?.status) {
        await generateSignatureApi(transfer?.result?.id, transfer?.result?.hash, getPrivateKey?.privatekey)
      }
      else {
        toast.error(getPrivateKey?.message || 'transaction initiation failed')
        setLoader(false)
      }
    }
    catch (e) {
      toast.error('Transfer failed')
      setLoader(false)
    }
  }

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
        {showConfirm ? (
          <div className="space-y-5">
            {/* Confirmation Header */}
            <div className="flex items-center space-x-3 border-b border-gray-100 dark:border-gray-700 pb-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loader}
                className="p-1 -ml-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                aria-label="Back to edit"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-senary dark:text-white">
                Confirm Transaction
              </h2>
            </div>

            {/* Assets being sent */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 text-center">You&apos;re sending</p>
              <div className="space-y-2">
                {rows.map((row, i) => {
                  const asset = findAsset(row.assetId);
                  return (
                    <div
                      key={i}
                      className="flex items-baseline justify-center gap-2 bg-[#E5E5E540] dark:bg-gray-700/40 rounded-xl py-3 px-4"
                    >
                      <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white shrink-0">
                        {row.amount}
                      </span>
                      <span title={asset?.name} className="text-base font-semibold text-gray-400 truncate">{asset?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* From and Recipient — both shown the same way: full DID in a
                mono box so they read consistently. */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">From</p>
              <div className="bg-[#E5E5E540] dark:bg-gray-700/40 rounded-xl p-3.5 font-mono text-sm text-gray-900 dark:text-white break-all leading-relaxed">
                {userDetails?.did}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Recipient</p>
              <div className="bg-[#E5E5E540] dark:bg-gray-700/40 rounded-xl p-3.5 font-mono text-sm text-gray-900 dark:text-white break-all leading-relaxed">
                {recipientAddress}
              </div>
              {recipientName && (
                <p className="text-xs text-gray-500">
                  Saved as <span className="font-semibold text-gray-700 dark:text-gray-300">{recipientName}</span>
                </p>
              )}
            </div>

            {/* Secondary details */}
            <div className="space-y-3 text-sm">
              {comments && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500 flex-shrink-0">Memo</span>
                  <span className="text-gray-700 dark:text-gray-200 break-all text-right">{comments}</span>
                </div>
              )}
            </div>

            {/* Don't show again */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={skipConfirm}
                onChange={handleToggleSkipConfirm}
                disabled={loader}
                className="w-4 h-4 accent-secondary rounded cursor-pointer"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">Don&apos;t show this again</span>
            </label>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={executeSend}
                disabled={loader}
                className="w-full bg-secondary hover:opacity-90 text-white font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loader ? (
                  <div className="flex justify-center items-center">
                    <div className="loader border-t-transparent text-sm border-solid border-2 border-white-500 rounded-full animate-spin w-6 h-6"></div>
                  </div>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    <span>Confirm &amp; Send</span>
                  </>
                )}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loader}
                  className="py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={resetAndClose}
                  disabled={loader}
                  className="py-3 rounded-xl font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* Header */}
        <div className="flex items-center space-x-4 z-100 border-b-2 pb-3">
          <button
            onClick={() => {
              if (loader) {
                return
              }
              resetForm()
              onClose();
            }}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-senary dark:text-white">
            Send Assets
          </h2 >
        </div >

        <form onSubmit={handleSendClick} className="space-y-6">

          {/* Favorites Section */}
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

          {/* Asset rows — each is one asset + amount to send */}
          <div className="space-y-4">
            {rows.map((row, i) => {
              const asset = findAsset(row.assetId);
              const options = availableAssetsForRow(i);
              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                      Transaction Amount
                    </label>
                    {asset && (
                      <span title={`${asset.balance} ${asset.name}`} className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                        Avail Bal: {asset.balance} {asset.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-stretch gap-2">
                    {/* Asset selector */}
                    <div className="relative" data-asset-dropdown>
                      <button
                        type="button"
                        disabled={loader}
                        onClick={() => setOpenRowIndex(openRowIndex === i ? null : i)}
                        className="h-full flex items-center gap-2 px-3 py-4 border rounded-lg text-sm font-semibold text-gray-900 dark:text-white bg-[#E5E5E540] dark:bg-gray-700 min-w-[110px] max-w-[140px] justify-between"
                      >
                        <span title={asset?.name} className="truncate">{asset?.name || 'Select'}</span>
                        <FiChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
                      </button>
                      {openRowIndex === i && (
                        <div className="absolute z-20 mt-1 w-56 max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          {options.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleSelectAsset(i, a.id)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${a.id === row.assetId ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                            >
                              <span title={a.name} className="font-semibold text-gray-900 dark:text-white truncate">{a.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{a.balance}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Amount input with asset name on the right */}
                    <div className="relative flex-1 bg-[#E5E5E540]">
                      <input
                        disabled={loader || !asset}
                        onWheel={(e) => e.target.blur()}
                        type="number"
                        value={row.amount}
                        onChange={(e) => handleAmountChange(i, e.target.value)}
                        placeholder="0.00"
                        className="text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full p-4 pr-24 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      />
                      {asset && (
                        <span
                          title={asset.name}
                          className="absolute right-3 top-1/2 -translate-y-1/2 max-w-[80px] truncate text-sm font-semibold text-gray-400 pointer-events-none"
                        >
                          {asset.name}
                        </span>
                      )}
                    </div>

                    {/* Remove row */}
                    {rows.length > 1 && (
                      <button
                        type="button"
                        disabled={loader}
                        onClick={() => handleRemoveRow(i)}
                        aria-label="Remove asset"
                        className="px-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add another asset */}
            {canAddRow && (
              <button
                type="button"
                disabled={loader}
                onClick={handleAddRow}
                className="flex items-center space-x-2 text-primary hover:text-primary-light text-sm font-semibold"
              >
                <FiPlus className="w-4 h-4" />
                <span>Add asset</span>
              </button>
            )}
          </div>

          {/* Recipient Address */}
          < div className="space-y-2" >
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Recipient Address
            </label>
            <div className="space-y-2">
              <div className="relative bg-[#E5E5E540]">
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
                  className="text-sm w-full p-4 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
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
                  <div className='flex items-center text-lg text-primary'>
                    <FiStar className="w-5 h-5 mr-1" />
                    <span className='font-semibold text-sm'>Save to Favorites</span>
                  </div>
                </motion.button>
              )}
            </div>
          </div >

          {/* Save to Favorites Form */}
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

          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Comment / Memo
          </label>
          <div className="relative bg-[#E5E5E540]">
            <input
              disabled={loader}
              type="text"
              value={comments}
              onChange={(e) => {
                setComments(e?.target.value);
              }}
              placeholder="Add a comment or memo"
              className="text-sm w-full p-4 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Submit Button */}
          <button
            disabled={loader || !canSend}
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
                  <span>Send</span>
                </>
              )
            }
          </button >
        </form >
        </>
        )}
      </motion.div >
    </div >
  );
}
