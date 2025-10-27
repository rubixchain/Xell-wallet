import { useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiChevronDown, FiChevronLeft, FiChevronUp, FiTrash, FiXCircle } from "react-icons/fi";
import indexDBUtil from "../../indexDB";
import { UserContext } from "../../context/userContext";
import { generateSignature, EXECUTE_API, isSignatureRoundRequired } from "../../utils";
import { END_POINTS } from "../../api/endpoints";
import { NETWORK_TYPES } from "../../../config";
import { WALLET_TYPES } from "../../enums";




function CustomDropdown({ options, selected, onSelect, onDelete }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="w-full p-2 mb-2 h-[45px] border min-h-[40px] rounded bg-white text-gray-900 flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-full">
                    <p className="w-full text-left text-sm font-semibold">{selected?.name}</p>
                    <p className="w-full text-left text-xs">{selected?.url}</p>
                </div>
                {isOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {isOpen && (
                <div className="absolute w-full bg-white text-gray-900 border rounded shadow-lg z-50">
                    {options.map((option, index) => (
                        <div
                            key={index}
                            className={`p-3 text-xs font-semibold cursor-pointer flex justify-between items-center ${selected?.url === option.url ? 'bg-gray-200' : ''}`}
                            onClick={() => {
                                onSelect(option);
                                setIsOpen(false);
                            }}
                        >
                            <span>{option?.url}</span>
                            {!option.default && (
                                <button
                                    className=" ml-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(option.url);
                                    }}
                                >
                                    <FiTrash className="text-black w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                    <div
                        className="p-3 text-sm  text-secondary font-bold cursor-pointer"
                        onClick={() => {
                            onSelect({ name: '+ Add API URL' });
                            setIsOpen(false);
                        }}
                    >
                        + Add API URL
                    </div>
                </div>
            )}
        </div>
    );
}

const getRpcUrl = (rpcUrls) => {
    return rpcUrls?.find(rpc => rpc.selected) || rpcUrls?.[0] || {};
}



export default function EditNetworkModal({ networks, network, onClickNetworkModalBack, onClose, addRpcUrl, setEditingNetwork, setNetworks, selectedNetworkIndex, setIsLoading }) {
    const { userDetails, setUserDetails } = useContext(UserContext);
    const modalRef = useRef(null);
    const networkmodalRef = useRef(null);
    const [errors, setErrors] = useState({});


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

    const onDeleteRpcUrl = (url) => {
        setEditingNetwork(prev => ({
            ...prev,
            rpcUrls: prev.rpcUrls.filter(rpc => rpc.url !== url)
        }))
    }

    const onSave = async () => {
        if (!network?.name) {
            toast.dismiss();
            return toast.error("Please enter network name");
        }
        if (!network?.rpcUrls?.length) {
            toast.dismiss();
            return toast.error("Please add API URL");
        }
        if (!network?.tokenName) {
            toast.dismiss();
            return toast.error("Please enter token name");
        }
        if (!network?.tokenSymbol) {
            toast.dismiss();
            return toast.error("Please enter token symbol");
        }

        try {
            setIsLoading(true);

            const updatedNetwork = {
                name: network.name,
                tokenName: network.tokenName,
                tokenSymbol: network.tokenSymbol,
                rpcUrls: network.rpcUrls.map((rpc, idx) => ({
                    ...rpc,
                    id: rpc.id || `custom-${Date.now()}-${idx}`,
                    name: rpc.name || `Node ${idx + 1}`,
                    default: false,
                    isCustom: true
                })),
                swarmKey: network.swarmKey || ''
            };

            if (updatedNetwork.rpcUrls.length === 1) {
                updatedNetwork.rpcUrls[0].selected = true;
            }

            const result = await indexDBUtil.addCustomNetworkGlobal(updatedNetwork);

            if (!result.status) {
                toast.error('Failed to save custom network');
                setIsLoading(false);
                return;
            }

            toast.success('Custom network added successfully');
            onClose();

            window.location.reload();
        }
        catch (error) {
            toast.dismiss();
            let msg = error?.message || 'Failed to save network';
            msg = msg.replace(/(code\s*\d{3})/gi, '').replace(/\d{3}/g, '').replace(/with status.*$/i, '').replace(/\s+/g, ' ').trim();
            if (/request failed/i.test(msg)) msg = 'Request failed';
            toast.error(msg);
        }
        finally {
            setIsLoading(false);
        }
    }

    const onChangeRpcUrl = (url) => {
        setEditingNetwork(prev => ({
            ...prev,
            rpcUrls: prev.rpcUrls.map(rpc => ({ ...rpc, selected: rpc?.url === url }))
        }))
        setErrors(prev => ({ ...prev, rpcUrls: undefined }));
    }

    return (
        <div className="fixed inset-0 z-50 p-4 bg-black bg-opacity-75 flex justify-center items-center">
            <div ref={modalRef} className="bg-white text-gray-900 rounded-lg shadow-lg w-96 p-6">
                <div className="flex justify-between items-center mb-4">
                    <button className="text-gray-900" onClick={onClickNetworkModalBack}>
                        <FiArrowLeft className='h-5 w-5' />
                    </button>

                    <h2 className="text-xl font-bold">{(selectedNetworkIndex && network?.name) ? network?.name : "Add a custom network"}</h2>
                    <button className="text-gray-500" onClick={onClose}>
                        <FiXCircle className='h-5 w-5' />
                    </button>

                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Network name</label>
                    <input type="text"
                        placeholder="Enter network name"
                        onChange={(e) => {
                            setEditingNetwork(prev => ({ ...prev, name: e.target.value }));
                            setErrors(prev => ({ ...prev, name: undefined }));
                        }}
                        value={network?.name || ''}
                        className="w-full p-2 h-[45px] mb-1 border rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary" />
                    {errors.name && (
                        <span className="text-red-500 text-xs mt-1 flex items-center" style={{ marginTop: '2px' }}>
                            <span className="mr-1">*</span>{errors.name}
                        </span>
                    )}
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Default REST URL</label>
                    <CustomDropdown
                        options={[...(network?.rpcUrls || [])]}
                        selected={getRpcUrl(network?.rpcUrls)}
                        onSelect={(option) => {
                            if (option?.name === '+ Add API URL') {
                                addRpcUrl()
                            }
                            else {
                                onChangeRpcUrl(option?.url)
                            }
                        }}
                        onDelete={(url) => {
                            onDeleteRpcUrl(url)
                        }}
                    />
                    {errors.rpcUrls && (
                        <span className="text-red-500 text-xs mt-1 flex items-center" style={{ marginTop: '2px' }}>
                            <span className="mr-1">*</span>{errors.rpcUrls}
                        </span>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Token Name</label>
                    <input
                        type="text"
                        value={network?.tokenName || ''}
                        onChange={(e) => {
                            setEditingNetwork(prev => ({ ...prev, tokenName: e.target.value }));
                            setErrors(prev => ({ ...prev, tokenName: undefined }));
                        }}
                        placeholder="Enter token name"
                        className="w-full p-2 h-[45px] mb-1 border rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                    {errors.tokenName && (
                        <span className="text-red-500 text-xs mt-1 flex items-center" style={{ marginTop: '2px' }}>
                            <span className="mr-1">*</span>{errors.tokenName}
                        </span>
                    )}
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Token Symbol</label>
                    <input
                        type="text"
                        value={network?.tokenSymbol || ''}
                        onChange={(e) => {
                            setEditingNetwork(prev => ({ ...prev, tokenSymbol: e.target.value }));
                            setErrors(prev => ({ ...prev, tokenSymbol: undefined }));
                        }}
                        placeholder="Enter token symbol"
                        className="w-full p-2 h-[45px] mb-1 border rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                    {errors.tokenSymbol && (
                        <span className="text-red-500 text-xs mt-1 flex items-center" style={{ marginTop: '2px' }}>
                            <span className="mr-1">*</span>{errors.tokenSymbol}
                        </span>
                    )}
                </div>

                {/* <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Creators DID (comma separated)</label>
                    <input
                        type="text"
                        value={network?.creatorsDid || ''}
                        onChange={(e) => setEditingNetwork(prev => ({ ...prev, creatorsDid: e.target.value }))}
                        placeholder="e.g., bafy12....,bafy23...."
                        className="w-full p-2 h-[45px] mb-2 border rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                </div> */}

                <button onClick={onSave} className="w-full border text-sm border-secondary text-secondary font-semibold h-[45px] rounded-full hover:bg-secondary hover:text-white transition-all duration-300">Save</button>
            </div>
        </div>
    );
}