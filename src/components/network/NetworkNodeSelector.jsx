import { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiXCircle, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import indexDBUtil from '../../indexDB';
import Button from '../Button';

export default function NetworkNodeSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentAccount,
  allAccounts,
  disableCurrentNetwork = true
}) {
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showNodeDropdown, setShowNodeDropdown] = useState(false);
  const [accountExistsInNetwork, setAccountExistsInNetwork] = useState(false);
  const [customNodeUrl, setCustomNodeUrl] = useState('');
  const [customNodeName, setCustomNodeName] = useState('');
  const [showAddCustomNode, setShowAddCustomNode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const modalRef = useRef(null);
  const networkDropdownRef = useRef(null);
  const nodeDropdownRef = useRef(null);

  useEffect(() => {
    const loadNetworks = async () => {
      const globalNetworks = await indexDBUtil.getGlobalNetworks();
      setNetworks(globalNetworks || []);
    };
    loadNetworks();
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target)) {
        setShowNetworkDropdown(false);
      }
      if (nodeDropdownRef.current && !nodeDropdownRef.current.contains(event.target)) {
        setShowNodeDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNetworkSelect = async (network) => {
    setSelectedNetwork(network);
    setShowNetworkDropdown(false);
    

    const bindings = await indexDBUtil.getAccountNetworkBindings(currentAccount?.username);
    const accountExists = bindings.some(b => b.networkId === network.id);
    setAccountExistsInNetwork(accountExists);
    
    if (!accountExists) {
      setShowNodeDropdown(false);
    } else {
      setShowNodeDropdown(false);
    }
  };

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setShowNodeDropdown(false);
  };

  const handleAddCustomNode = async () => {
    if (!customNodeUrl.trim()) {
      toast.error('Please enter a node URL');
      return;
    }

    if (!customNodeName.trim()) {
      toast.error('Please enter a node name');
      return;
    }

    try {
      const isValid = await indexDBUtil.validateSwarmKey(customNodeUrl.trim(), selectedNetwork.swarmKey);
      if (!isValid) {
        toast.error('Invalid node - swarm key does not match network');
        return;
      }

      const customNode = {
        id: Date.now(),
        name: customNodeName.trim(),
        url: customNodeUrl.trim(),
        isCustom: true,
        selected: false
      };

      await indexDBUtil.addCustomNodeToNetwork(selectedNetwork.id, customNode);
      
      const updatedNetworks = networks.map(network => 
        network.id === selectedNetwork.id 
          ? { ...network, rpcUrls: [...(network.rpcUrls || []), customNode] }
          : network
      );
      setNetworks(updatedNetworks);
      
      setSelectedNetwork(prev => ({
        ...prev,
        rpcUrls: [...(prev.rpcUrls || []), customNode]
      }));
      
      handleNodeSelect(customNode);
      
      setCustomNodeUrl('');
      setCustomNodeName('');
      setShowAddCustomNode(false);
      toast.success('Custom node added successfully');
    } catch (error) {
      toast.error('Failed to add custom node');
    }
  };

  const handleConfirm = async () => {
    if (!selectedNetwork) {
      toast.error('Please select a network');
      return;
    }

    if (!accountExistsInNetwork && !selectedNode) {
      toast.error('Please select a node');
      return;
    }

    setIsLoading(true);
    try {
      await onSelect(selectedNetwork, selectedNode, accountExistsInNetwork);
    } catch (error) {
      console.error('Error in network selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentNetwork = () => {
    if (!currentAccount) return null;
    
    const currentNetworkId = currentAccount?.network;
    
    
    if (!currentNetworkId) return null;
    
    const currentNetwork = networks.find(network => 
      network.id === currentNetworkId || 
      network.id === parseInt(currentNetworkId) || 
      network.id === String(currentNetworkId)
    );
    return currentNetwork || null;
  };

  const getNetworkNodes = () => {
    if (!selectedNetwork) return [];
    return selectedNetwork.rpcUrls || [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center">
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg w-[95vw] h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Select Network & Node</h2>
          <button className="text-gray-500" onClick={onClose}>
            <FiXCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Network
              </label>
              <div className="relative" ref={networkDropdownRef}>
                <button
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  className={`w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                    selectedNetwork 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-300'
                  }`}
                >
                  <span className={selectedNetwork ? 'text-gray-900' : 'text-gray-500'}>
                    {selectedNetwork ? selectedNetwork.name : 'Choose a network'}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                     {showNetworkDropdown && (
                       <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                         {networks.map((network) => {
                           const currentNetwork = getCurrentNetwork();
                           const isCurrentNetwork = currentNetwork?.id === network.id || 
                                                   currentNetwork?.id === parseInt(network.id) || 
                                                   currentNetwork?.id === String(network.id);
                           const shouldDisable = disableCurrentNetwork && isCurrentNetwork;
                           return (
                             <button
                               key={network.id}
                               onClick={() => handleNetworkSelect(network)}
                               disabled={shouldDisable}
                               className={`w-full text-left px-4 py-3 ${
                                 shouldDisable 
                                   ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                   : 'text-gray-900 hover:bg-green-50'
                               }`}
                             >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                   {network?.logo ? (
                                     <img
                                       src={network?.logo}
                                       alt={network.logo}
                                       className="h-5 w-5 rounded-sm"
                                       onError={(e) => {
                                         e.target.style.display = 'none';
                                       }}
                                     />
                                   ) : (
                                     <span className="text-gray-900 border border-secondary font-medium text-secondary h-7 text-center flex items-center justify-center w-7 rounded-full text-sm">
                                       {network.name?.slice(0, 1)?.toUpperCase()}
                                     </span>
                                   )}
                                   <span>{network.name}</span>
                                 </div>
                                 {isCurrentNetwork && shouldDisable && (
                                   <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
                                     Current
                                   </span>
                                 )}
                               </div>
                             </button>
                           );
                         })}
                       </div>
                     )}
              </div>
            </div>

            {selectedNetwork && !accountExistsInNetwork && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Node
                </label>
                <div className="relative" ref={nodeDropdownRef}>
                  <button
                    onClick={() => setShowNodeDropdown(!showNodeDropdown)}
                    className={`w-full flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                      selectedNode 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className={selectedNode ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                        {selectedNode ? (selectedNode.name || 'Default') : 'Choose a node'}
                      </span>
                      {selectedNode && (
                        <span className="text-xs text-gray-500 font-mono truncate">
                          {selectedNode.url}
                        </span>
                      )}
                    </div>
                    <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showNodeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showNodeDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {getNetworkNodes().map((node, index) => (
                        <button
                          key={index}
                          onClick={() => handleNodeSelect(node)}
                          className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-900"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{node.name || 'Default'}</span>
                              {node.isCustom && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-mono truncate mt-1">
                              {node.url}
                            </span>
                          </div>
                        </button>
                      ))}
                      
                      <div className="border-t border-gray-200 p-2">
                        <button
                          onClick={() => setShowAddCustomNode(!showAddCustomNode)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-green-50 rounded"
                        >
                          <FiPlus className="w-4 h-4" />
                          Add Custom Node
                        </button>
                      </div>
                      
                      {showAddCustomNode && (
                        <div className="border-t border-gray-200 p-3 bg-gray-50">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={customNodeName}
                              onChange={(e) => setCustomNodeName(e.target.value)}
                              placeholder="Enter node name (e.g., My Custom Node)"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customNodeUrl}
                                onChange={(e) => setCustomNodeUrl(e.target.value)}
                                placeholder="Enter custom node URL"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={handleAddCustomNode}
                                className="px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedNetwork && accountExistsInNetwork && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Account already exists in {selectedNetwork.name}. No node selection needed.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
            >
              Cancel
            </button>
                   <button
                     onClick={handleConfirm}
                     disabled={isLoading}
                     className={`flex-1 px-4 py-3 rounded-lg font-semibold flex items-center justify-center ${
                       isLoading 
                         ? 'bg-gray-400 cursor-not-allowed' 
                         : 'bg-primary text-white hover:bg-primary/90'
                     }`}
                   >
                     {isLoading ? (
                       <div className="flex items-center gap-2">
                         <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                         <span>Processing...</span>
                       </div>
                     ) : (
                       'Confirm'
                     )}
                   </button>
          </div>
        </div>
      </div>
    </div>
  );
}
