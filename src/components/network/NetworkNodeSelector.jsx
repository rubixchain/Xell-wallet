import { useState, useEffect } from 'react';
import { config } from '../../../config';
import indexDBUtil from '../../indexDB/index';
import { verifyNodeSwarmKey } from '../../utils/nodeVerification';
import toast from 'react-hot-toast';

export default function NetworkNodeSelector({ username, onSelect, onClose }) {
    const [networks, setNetworks] = useState([]);
    const [accountBindings, setAccountBindings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNetworksAndBindings();
    }, [username]);

    const loadNetworksAndBindings = async () => {
        try {
            const rubixMainnetUrl = config.RUBIX_MAINNET_BASE_URL;
            const rubixTestnetUrl = config.RUBIX_TESTNET_BASE_URL;

            const defaultNetworks = [
                {
                    id: 1,
                    name: 'Rubix Mainnet',
                    swarmKey: 'RUBIX_MAINNET_SWARM_KEY',
                    tokenSymbol: 'RBT',
                    nodes: [
                        {
                            id: 1,
                            name: 'Mainnet Node 1',
                            url: rubixMainnetUrl,
                            isDefault: true
                        }
                    ]
                },
                {
                    id: 2,
                    name: 'Rubix Testnet',
                    swarmKey: 'RUBIX_TESTNET_SWARM_KEY',
                    tokenSymbol: 'RBT',
                    nodes: [
                        {
                            id: 1,
                            name: 'Testnet Node 1',
                            url: rubixTestnetUrl,
                            isDefault: true
                        }
                    ]
                }
            ];

            setNetworks(defaultNetworks);

            const bindings = await indexDBUtil.getAccountNetworkBindings(username);
            setAccountBindings(bindings);

            setLoading(false);
        } catch (error) {
            toast.error('Failed to load networks');
            setLoading(false);
        }
    };

    const handleNodeSelect = async (network, node) => {
        const exists = accountBindings.some(
            b => b.networkId === network.id && b.nodeId === node.id
        );

        if (exists) {
            onSelect(network, node);
        } else {
            toast.error('Account not registered on this node');
        }
    };

    const canAddCustomNode = (networkId) => {
        const existsInNetwork = accountBindings.some(b => b.networkId === networkId);
        return !existsInNetwork;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
                    <p className="text-senary dark:text-white">Loading networks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-senary dark:text-white">
                        Select Network & Node
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-quinary hover:text-senary dark:hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {networks.map((network) => {
                        const accountExistsInNetwork = accountBindings.some(
                            b => b.networkId === network.id
                        );

                        return (
                            <div key={network.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">🌐</span>
                                    <h3 className="font-semibold text-senary dark:text-white">
                                        {network.name}
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    {network.nodes.map((node) => {
                                        const binding = accountBindings.find(
                                            b => b.networkId === network.id && b.nodeId === node.id
                                        );
                                        const isEnabled = !!binding;

                                        return (
                                            <button
                                                key={node.id}
                                                onClick={() => isEnabled && handleNodeSelect(network, node)}
                                                disabled={!isEnabled}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                                    isEnabled
                                                        ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                                                        : 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">{isEnabled ? '✅' : '⚫'}</span>
                                                        <div>
                                                            <p className="font-medium text-sm text-senary dark:text-white">
                                                                {node.name}
                                                            </p>
                                                            <p className="text-xs text-quinary dark:text-gray-400">
                                                                {node.url}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => {
                                            if (canAddCustomNode(network.id)) {
                                                toast('Add custom node feature coming soon');
                                            }
                                        }}
                                        disabled={!canAddCustomNode(network.id)}
                                        className={`w-full text-left p-3 rounded-lg border-2 border-dashed transition-colors ${
                                            canAddCustomNode(network.id)
                                                ? 'border-secondary hover:bg-secondary/5 cursor-pointer'
                                                : 'border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">
                                                {canAddCustomNode(network.id) ? '✅' : '⚫'}
                                            </span>
                                            <p className="font-medium text-sm text-secondary">
                                                + Add Custom Node
                                            </p>
                                        </div>
                                        {!canAddCustomNode(network.id) && (
                                            <p className="text-xs text-quinary dark:text-gray-400 ml-6 mt-1">
                                                Account already exists in this network
                                            </p>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">⚙️</span>
                            <h3 className="font-semibold text-senary dark:text-white">
                                Custom Networks
                            </h3>
                        </div>
                        <button
                            onClick={() => toast('Add custom network feature coming soon')}
                            className="w-full text-left p-3 rounded-lg border-2 border-dashed border-secondary hover:bg-secondary/5 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm">✅</span>
                                <p className="font-medium text-sm text-secondary">
                                    + Add Custom Network
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
