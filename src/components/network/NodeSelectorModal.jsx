import { useState } from 'react';
import { FiXCircle, FiCheck, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import indexDBUtil from '../../indexDB';

export default function NodeSelectorModal({ network, onClose, onSelectNode, accountExistsInNetwork }) {
  const [customNodeUrl, setCustomNodeUrl] = useState('');
  const [selectedNode, setSelectedNode] = useState(
    network?.rpcUrls?.find(rpc => rpc.selected) || null
  );

  const handleNodeSelect = (rpcUrl) => {
    const isRegisteredOnThisNode = rpcUrl.registered || rpcUrl.selected;
    const canSwitch = isRegisteredOnThisNode || !accountExistsInNetwork;

    if (canSwitch) {
      onSelectNode(network, rpcUrl);
    }
  };

  const handleAddCustomNode = async () => {
    if (!customNodeUrl.trim()) {
      toast.error('Please enter a node URL');
      return;
    }

    try {

      const isValid = await indexDBUtil.validateSwarmKey(customNodeUrl.trim(), network.swarmKey);

      if (!isValid) {
        toast.error('Invalid node - swarm key does not match network');
        return;
      }

      const customNode = {
        id: Date.now(),
        name: `Custom Node`,
        url: customNodeUrl.trim(),
        isCustom: true,
        selected: false
      };

      network.rpcUrls = [...(network.rpcUrls || []), customNode];

      await indexDBUtil.addCustomNodeToNetwork(network.id, customNode);

      if (!accountExistsInNetwork) {
        toast.success('Custom node added successfully');
        onSelectNode(network, customNode);
      } else {
        toast.success('Custom node added. Switch to it after creating a new account.');
      }

      setCustomNodeUrl('');
    } catch (error) {
      toast.error('Failed to add custom node');
    }
  };

  return (
    <div className="fixed inset-0 p-4 bg-black bg-opacity-75 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Select node</h2>
            <p className="text-sm text-gray-500 mt-1">{network?.name}</p>
          </div>
          <button className="text-gray-500" onClick={onClose}>
            <FiXCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            <div className="flex gap-2 items-center mb-4">
              <input
                type="text"
                value={customNodeUrl}
                onChange={(e) => setCustomNodeUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomNode()}
                placeholder="Add custom node URL"
                className="flex-1 h-[48px] px-4 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs outline-none"
              />
              <button
                onClick={handleAddCustomNode}
                disabled={!customNodeUrl.trim()}
                className="h-[48px] bg-primary text-white px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors text-xs font-medium"
              >
                Add
              </button>
            </div>

            {network?.rpcUrls && network.rpcUrls.length > 0 ? (
              <>
                {network.rpcUrls.map((rpcUrl, index) => {
                  const isRegisteredOnThisNode = rpcUrl.registered || rpcUrl.selected;
                  const isClickable = isRegisteredOnThisNode || !accountExistsInNetwork;

                  return (
                  <button
                    key={index}
                    onClick={() => isClickable && handleNodeSelect(rpcUrl)}
                    disabled={!isClickable}
                    className={`w-full h-[48px] px-4 rounded-lg transition-colors text-left border ${
                      selectedNode?.url === rpcUrl.url
                        ? 'bg-green-50 border-green-200'
                        : isRegisteredOnThisNode && accountExistsInNetwork
                        ? 'border-green-200 hover:bg-green-50'
                        : isClickable
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {selectedNode?.url === rpcUrl.url && (
                        <FiCheck className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-900 truncate flex items-center gap-2">
                          {rpcUrl.url}
                          {rpcUrl.isCustom && (
                            <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No default nodes available for this network
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
