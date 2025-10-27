import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/Card';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { UserContext } from '../context/userContext';
import { config, NETWORK_TYPES } from '../../config';
import { routes } from '../routes/routes';
import { FiCheck, FiPlus, FiX } from 'react-icons/fi';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';
import { EXECUTE_API } from '../utils';
import { WALLET_TYPES } from '../enums';

export default function NetworkNodeSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails, setUserDetails, setIsUserLoggedIn, websiteInitiated, setWebsiteInitiated } = useContext(UserContext);

  const [step, setStep] = useState('network');
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showAddCustomNode, setShowAddCustomNode] = useState(false);
  const [customNodeUrl, setCustomNodeUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loader, setLoader] = useState(false);

  const rubixMainnetUrl = config.RUBIX_MAINNET_BASE_URL;
  const rubixTestnetUrl = config.RUBIX_TESTNET_BASE_URL;

  const defaultNetworks = [
    {
      id: 1,
      name: 'Rubix Mainnet',
      tokenSymbol: 'RBT',
      swarmKey: 'RUBIX_MAINNET_SWARM_KEY',
      logo: '/network/rubix.png',
      nodes: [
        { id: 1, name: 'Mainnet Node 1', url: rubixMainnetUrl }
      ]
    },
    {
      id: 2,
      name: 'Rubix Testnet',
      tokenSymbol: 'RBT',
      swarmKey: 'RUBIX_TESTNET_SWARM_KEY',
      logo: '/network/rubix.png',
      nodes: [
        { id: 1, name: 'Testnet Node 1', url: rubixTestnetUrl }
      ]
    },
    {
      id: 3,
      name: 'Custom Network',
      tokenSymbol: 'CUSTOM',
      swarmKey: 'CUSTOM_SWARM_KEY',
      isCustom: true,
      nodes: []
    }
  ];

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    setStep('node');
  };

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };

  const handleBack = () => {
    if (step === 'node') {
      setStep('network');
      setSelectedNode(null);
      setShowAddCustomNode(false);
      setCustomNodeUrl('');
    } else {
      navigate(-1);
    }
  };

  const handleAddCustomNode = () => {
    if (!customNodeUrl) return;

    const customNode = {
      id: Date.now(),
      name: `Custom Node`,
      url: customNodeUrl,
      isCustom: true
    };

    const updatedNetwork = {
      ...selectedNetwork,
      nodes: [...selectedNetwork.nodes, customNode]
    };

    setSelectedNetwork(updatedNetwork);
    setSelectedNode(customNode);
    setShowAddCustomNode(false);
    setCustomNodeUrl('');
  };

  const handleContinue = async () => {
    if (!selectedNetwork || !selectedNode) return;

    try {
      setLoader(true);
      indexDBUtil.storeNetworkSetting({
        network: selectedNetwork.id,
        RPCUrl: selectedNode.url,
        name: selectedNetwork.name,
        tokenSymbol: selectedNetwork.tokenSymbol
      });

      const res = await indexDBUtil.savePrivateKeyV4('UserDetails', {
        ...userDetails,
        originalPhrase: location.state?.mnemonic,
        network: selectedNetwork.id,
        networkId: selectedNetwork.id,
        nodeId: selectedNode.id,
        nodeUrl: selectedNode.url,
        swarmKey: selectedNetwork.swarmKey
      });

      setLoader(false);

      if (!res || !res?.status) {
        toast.error('Failed to create account');
        return;
      }

      const hasUnifiedPassword = await indexDBUtil.hasUnifiedPassword();
      if (!hasUnifiedPassword) {
        await indexDBUtil.setUnifiedPasswordForSingleUser(userDetails.pin);
      }
      await indexDBUtil.setCurrentVersion(5);

      toast.success('Account created successfully');
      setIsUserLoggedIn(true);

      localStorage.setItem('currency', JSON.stringify({ label: '$ USD - US Dollar', value: 'USD' }));
      localStorage.setItem("currentUser", JSON.stringify({
        username: res?.data?.username,
        network: selectedNetwork.id,
      }));

      if (websiteInitiated?.type == WALLET_TYPES.WALLET_SIGN_REQUEST) {
        try {
          window.close();
          let result = await EXECUTE_API({
            data: {
              did: res?.data?.did,
              username: res?.data?.username,
              network: selectedNetwork.id,
              pin: res?.data?.pin,
              tokenSymbol: selectedNetwork.tokenSymbol
            },
            type: WALLET_TYPES.WALLET_SIGN_RESPONSE
          });
          if (result) {
            setWebsiteInitiated(null);
          }
        } catch (e) {
          console.error(e);
        }
        return;
      }

      await EXECUTE_API({
        data: {
          publickey: res?.data?.publickey,
          did: res?.data?.did,
          username: res?.data?.username,
          network: selectedNetwork.id,
          pin: res?.data?.pin,
          tokenSymbol: selectedNetwork.tokenSymbol
        },
        type: WALLET_TYPES.STORE_USER_DETAILS
      });

      setUserDetails({
        publickey: res?.data?.publickey,
        did: res?.data?.did,
        username: res?.data?.username,
        network: selectedNetwork.id,
        pin: res?.data?.pin,
        tokenSymbol: selectedNetwork.tokenSymbol
      });

      navigate(routes.SUCCESS, { replace: true });
    } catch (e) {
      setLoader(false);
      toast.error('Failed to create account');
      console.error(e);
    }
  };

  return (
    <Card>
      <div className="space-y-6 flex flex-col w-full justify-center">
        <BackButton onClick={handleBack} />

        <AnimatePresence mode="wait">
          {step === 'network' ? (
            <motion.div
              key="network-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className='flex-1'>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
                  Select a network
                </h1>
              </div>

              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />

              <div>
                <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
                  Available networks
                </h3>
                <div className="space-y-2">
                  {defaultNetworks
                    .filter(network =>
                      network.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((network) => (
                      <button
                        key={network.id}
                        onClick={() => handleNetworkSelect(network)}
                        className="w-full flex items-center p-3 rounded-lg hover:bg-tertiary hover:bg-opacity-90 transition-colors text-left"
                      >
                        {network?.logo ? (
                          <img
                            src={network.logo}
                            alt={network.name}
                            className="mr-3 rounded-sm h-5 w-5"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="mr-3 border border-secondary font-medium text-secondary h-7 text-center flex items-center justify-center w-7 rounded-full text-sm">
                            {network.name?.slice(0, 1)?.toUpperCase()}
                          </span>
                        )}
                        <span className="text-base text-gray-900 dark:text-white font-medium">
                          {network.name}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="node-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className='flex-1'>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
                  Select node
                </h1>
                <p className="text-quinary font-medium dark:text-gray-300 mt-1">
                  {selectedNetwork?.name}
                </p>
              </div>

              <div className="space-y-2">
                {selectedNetwork?.nodes && selectedNetwork.nodes.length > 0 ? (
                  <>
                    {selectedNetwork.nodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleNodeSelect(node)}
                        className={`w-full p-4 rounded-lg transition-colors text-left border ${
                          selectedNode?.id === node.id
                            ? 'bg-tertiary bg-opacity-90 border-primary'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {node.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                              {node.url}
                            </div>
                          </div>
                          {selectedNode?.id === node.id && (
                            <FiCheck className="w-5 h-5 text-primary ml-2" />
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No default nodes available for this network
                  </div>
                )}

                {!showAddCustomNode ? (
                  <button
                    onClick={() => setShowAddCustomNode(true)}
                    className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary transition-colors text-gray-600 dark:text-gray-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <FiPlus className="w-5 h-5" />
                      <span>Add Custom Node</span>
                    </div>
                  </button>
                ) : (
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Add Custom Node
                      </span>
                      <button
                        onClick={() => {
                          setShowAddCustomNode(false);
                          setCustomNodeUrl('');
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customNodeUrl}
                      onChange={(e) => setCustomNodeUrl(e.target.value)}
                      placeholder="Enter custom node URL"
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleAddCustomNode}
                      disabled={!customNodeUrl}
                      className="w-full bg-primary text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleContinue}
                disabled={!selectedNode || loader}
              >
                {loader ? (
                  <div className="flex justify-center items-center">
                    <div className="loader border-t-transparent border-solid border-2 border-white-500 rounded-full animate-spin w-6 h-6"></div>
                  </div>
                ) : (
                  'Continue'
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
