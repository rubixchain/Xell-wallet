import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiChevronLeft, FiXCircle } from "react-icons/fi";
import { ENDPOINT_TYPES, DEFAULT_ENDPOINT_TYPE, normalizeUrlWithEndpoint } from "../../utils/endpointConfig";

export default function AddRpcUrlModal({ onClose, onClickRpcUrlModalBack, setEditingNetwork, selectedNetworkIndex, network }) {
    const [rpcUrl, setRpcUrl] = useState('');
    const [rpcName, setRpcName] = useState('');
    const [appendApi, setAppendApi] = useState(true); // Default to true for backward compatibility
    const [error, setError] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);
    const handleAddRpcUrl = () => {
        if (!rpcUrl) {
            setError('Required URL');
            return toast.error('Please enter valid API URL');
        }
        setError('');
        
        // Apply endpoint type to URL using the utility function
        const finalUrl = normalizeUrlWithEndpoint(rpcUrl, appendApi ? DEFAULT_ENDPOINT_TYPE : '');
        
        setEditingNetwork(prev => {
            const base = selectedNetworkIndex != null
                ? prev
                : {
                    name: network?.name || '',
                    
                    rpcUrls: prev?.rpcUrls || [],
                    tokenName: network?.tokenName || '',
                    tokenSymbol: network?.tokenSymbol || ''
                };

            return {
                ...base,
                rpcUrls: [
                    ...(base.rpcUrls || []).map(rpc => ({ ...rpc, selected: false })),
                    {
                        name: rpcName,
                        url: finalUrl,
                        default: false,
                        selected: true
                    }
                ]
            };
        });
        onClickRpcUrlModalBack()
    }

    return (
        <div className="fixed z-50 p-4 inset-0 bg-black bg-opacity-75 flex justify-center items-center">
            <div ref={modalRef} className="bg-white text-gray-900 rounded-lg shadow-lg w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                    <button className="text-gray-900" onClick={onClickRpcUrlModalBack}>
                        <FiArrowLeft className='h-5 w-5' />
                    </button>
                    <h2 className="text-xl font-bold">Add API URL</h2>
                    <button className="text-gray-500" onClick={onClose}>
                        <FiXCircle className='h-5 w-5' />
                    </button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">API URL</label>
                    <input value={rpcUrl} onChange={(e) => { setRpcUrl(e.target.value); setError(''); }} type="text" placeholder="Enter API URL" className="w-full text-sm p-2 mb-1 border h-[45px] rounded bg-white text-gray-900" />
                    {error && (
                        <span className="text-red-500 text-xs mt-1 flex items-center" style={{ marginTop: '2px' }}>
                            <span className="mr-1">*</span>{error}
                        </span>
                    )}
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">API Name (Optional)</label>
                    <input value={rpcName} onChange={(e) => setRpcName(e.target.value)} type="text" placeholder="Enter a name to identify the URL" className="w-full h-[45px] text-sm p-2 mb-1 border rounded bg-white text-gray-900" />
                </div>
                
                <div className="mb-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="appendApi"
                            checked={appendApi}
                            onChange={(e) => setAppendApi(e.target.checked)}
                            className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 rounded"
                        />
                        <label htmlFor="appendApi" className="text-sm text-gray-900">
                            Add /api endpoint
                        </label>
                    </div>
                </div>
                <button onClick={handleAddRpcUrl} className="w-full border border-secondary text-secondary font-semibold text-sm h-[45px] rounded-full hover:bg-secondary hover:text-white transition-all duration-300 bg-green-700 text-white">Add URL</button>
            </div>
        </div>
    );
}