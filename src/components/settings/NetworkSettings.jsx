import { useContext, useState } from 'react';
import { FiCheck, FiChevronDown, FiGlobe } from 'react-icons/fi';
import SettingCard from './SettingCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useRef } from 'react';
import { UserContext } from '../../context/userContext';
import { END_POINTS } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { generateSignature, isSignatureRoundRequired } from '../../utils';
import indexDBUtil from '../../indexDB';
import { config } from '../../../config';

export default function NetworkSettings() {

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { selectedNetwork, userDetails, setSelectedNetwork } = useContext(UserContext)
  const [isLoading, setIsLoading] = useState(false);
  const sortOptions = [
    { label: 'Testnet', value: 'testnet' },
    { label: 'Mainnet', value: 'mainnet' }
  ];

  const networks = {
    mainnet: {
      label: 'Mainnet',
      color: 'bg-green-500',
      glow: 'shadow-green-500/20'
    },
    testnet: {
      label: 'Testnet',
      color: 'bg-purple-500',
      glow: 'shadow-purple-500/20'
    }
  };
  // const [network, setNetwork] = useState('Mainnet');
  const popupRef = useRef(null)


  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [])

  const onClickRegisterDid = async () => {
    setIsLoading(true);
    try {
      
      let registerDid = await END_POINTS.register_did({ did: userDetails?.did });
      if (!registerDid || !registerDid?.status) {
        toast.error(registerDid?.message || 'Failed to register DID');
        return;
      }
      toast.success(registerDid?.message || 'Signature needed');
      let getPrivateKey = await indexDBUtil.getData("UserDetails", userDetails?.username, userDetails?.pin)
      let signature = await generateSignature(getPrivateKey?.privatekey, registerDid?.result?.hash);
      let signatureResponse = await END_POINTS.signature_response({
        id: registerDid?.result?.id,
        Signature: { Signature: signature },
        mode: 4
      });
     
      if (!signatureResponse?.status) {
        return toast.error(signatureResponse?.message || "Failed to register DID")
      }
      toast.success(signatureResponse?.message || "DID registered successfully")
    } catch (error) {
      toast.error('Failed to register DID');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Chain Connect
      </h2>

      <SettingCard>
        <div className="">
          {/* {config.TESTNETS.includes(userDetails.network) && (
            <div className='flex p-2 justify-between items-center w-full'>
              <p className='text-gray-900 text-sm font-medium'>Add Testnet faucet</p>

              <button
                onClick={() => window.open('http://103.209.145.177:4000/', '_blank')}
                className="px-4 py-2 bg-secondary text-white text-xs rounded-lg transition-colors"
              >
                Add
              </button>
            </div>)} */}
          <div className='flex p-2 mt-4 justify-between items-center w-full'>
            <p className='text-gray-900 text-sm font-medium'>Register Your DID</p>
            <button
              disabled={isLoading}
              onClick={onClickRegisterDid}
              className="px-4 py-2 bg-secondary text-xs  text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                'Register'
              )}
            </button>
          </div>

        </div>
      </SettingCard>
    </div>
  );
}