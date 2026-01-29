import { useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiGlobe } from 'react-icons/fi';
import NetworkSelector from './NetworkSelector';
import { UserContext } from '../../context/userContext';
import indexDBUtil from '../../indexDB';
import EditNetworkModal from './EditNetworkModal';
import AddRpcUrlModal from './AddUrl';
import toast from 'react-hot-toast';
import { EXECUTE_API } from '../../utils';
import { WALLET_TYPES } from '../../enums';





export default function NetworkSwitcher() {
  const { selectedNetwork, setSelectedNetwork, userDetails, setUserDetails } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditNetworkOpen, setIsEditNetworkOpen] = useState(false);
  const [isAddRpcUrlOpen, setIsAddRpcUrlOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState(null);
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState(null);
  const popupRef = useRef(null);

  const [networks, setNetworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userDetails?.did || !isOpen) return;
    const fetchNetworks = async () => {
      const networks = await indexDBUtil.getNetworksByDID(userDetails?.did);
      setNetworks(networks);
    };
    fetchNetworks();
  }, [userDetails?.did, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNetworkChange = async (network) => {
    if (!network?.id || !userDetails?.did) {
      toast.error('Invalid network or user details');
      return;
    }
    let currentNetworkSettings = null;

    try {
      setIsLoading(true)
      currentNetworkSettings = await indexDBUtil.getNetworkSetting();

      const networkSetting = {
        network: network.id,
        RPCUrl: network.rpcUrls?.find(item => item?.selected)?.url,
        name: network.name,
        tokenSymbol: network.tokenSymbol
      };

      await indexDBUtil.storeNetworkSetting(networkSetting);


      const res = await indexDBUtil.changeSelectedNetwork(userDetails.did, network.id);
      if (!res?.status) {
        toast.error('Failed to change network');
      }

      setNetworks(res.data.networks);
      await indexDBUtil.updateUserDetailsNetwork(userDetails.did, network.id);
      setSelectedNetwork(network.id);
      setUserDetails({
        ...userDetails,
        network: network.id,
        tokenSymbol: network.tokenSymbol
      })
      await EXECUTE_API({
        data: {
          ...userDetails,
          network: network.id,
          tokenSymbol: network.tokenSymbol
        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      })
      setIsOpen(false);

      toast.success('Network changed successfully');
    } catch (error) {
    
      toast.error(error.message || 'Failed to change network');

      if (currentNetworkSettings) {
        await indexDBUtil.storeNetworkSetting(currentNetworkSettings);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsEditNetworkOpen(false);
    setIsAddRpcUrlOpen(false);
    setEditingNetwork(null);
    setSelectedNetworkIndex(null);
  };

  const onClickNetworkModalBack = () => {
    setIsEditNetworkOpen(false);
    setIsAddRpcUrlOpen(false);
    setIsOpen(true);
  };

  const onClickRpcUrlModalBack = () => {
    setIsAddRpcUrlOpen(false);
    setIsEditNetworkOpen(true);
  };
  const addRpcUrl = () => {
    setIsAddRpcUrlOpen(true);
    setIsEditNetworkOpen(false);
  };

  return (
    <div>
      <motion.button
        onClick={() => {
          setIsOpen(!isOpen)
          setEditingNetwork(null)
        }}
        className="flex items-center space-x-2 px-1 py-1 rounded-xl bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-750 border border-gray-200/80 dark:border-gray-700/80 hover:border-primary/20 dark:hover:border-primary/20 shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="p-1 bg-primary/5 dark:bg-primary/10 rounded-lg">
            <FiGlobe className="w-4 h-4 text-primary" />
          </div>
        </div>
      </motion.button>

      {isOpen && (
        <div>
          <NetworkSelector
            setSelectedNetworkIndex={setSelectedNetworkIndex}
            networks={networks}
            selectedNetwork={selectedNetwork}
            setIsOpen={setIsOpen}
            setIsEditNetworkOpen={setIsEditNetworkOpen}
            setEditingNetwork={setEditingNetwork}
            handleNetworkClick={handleNetworkChange}
          />
        </div>
      )}

      {isEditNetworkOpen && (
        <EditNetworkModal
          setIsLoading={setIsLoading}
          selectedNetworkIndex={selectedNetworkIndex}
          setNetworks={setNetworks}
          networks={networks}
          onClickNetworkModalBack={onClickNetworkModalBack}
          network={editingNetwork}
          setIsAddRpcUrlOpen={setIsAddRpcUrlOpen}
          onClose={closeModal}
          addRpcUrl={addRpcUrl}
          setEditingNetwork={setEditingNetwork}
        />
      )}

      {isAddRpcUrlOpen && (
        <AddRpcUrlModal
          selectedNetworkIndex={selectedNetworkIndex}
          setEditingNetwork={setEditingNetwork}
          onClickRpcUrlModalBack={onClickRpcUrlModalBack}
          network={editingNetwork}
          onClose={closeModal} />
      )}
      {isLoading &&
        <div style={{ zIndex: 1000 }} className="fixed inset-0 p-4 bg-black bg-opacity-75 z-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      }
    </div>
  );
}