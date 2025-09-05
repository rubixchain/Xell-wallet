import React, { useContext } from 'react';
import { UserContext } from '../context/userContext';
import { WALLET_TYPES } from '../enums';
import { EXECUTE_API, generateSignature } from '../utils';
import indexDBUtil from '../indexDB';
import toast from 'react-hot-toast';

const Requests = () => {
    const { websiteInitiated, setWebsiteInitiated, userDetails } = useContext(UserContext);


    const handleConnect = async () => {
        const handleWebsiteInitiated = async (type, apiType) => {
            try {
                let payload = { ...websiteInitiated?.initiated?.data };
                await EXECUTE_API({
                    data: {
                        ...userDetails,
                        payload: payload
                    },
                    type: apiType,
                    requestId: websiteInitiated?.initiated?.requestId
                });
                window.close();
            } catch (e) {
             
            }
        };

        const handleSignature = async (type, apiType) => {
            let payload = websiteInitiated?.initiated?.data;

            let pin = userDetails?.pin;

            const result = await indexDBUtil.getData('UserDetails', userDetails?.username, pin);

            if (!result?.status || !result?.privatekey) {
                toast.error('Failed to retrieve private key.');
                return;
            }

            try {
                payload = btoa(payload);

                let signature = await generateSignature(result.privatekey, payload);

                function bytesToBase64(bytes) {
                    const binaryString = String.fromCharCode.apply(null, bytes);
                    return btoa(binaryString);
                }

                const signatureBase64 = bytesToBase64(signature);

                await EXECUTE_API({
                    data: {
                        signature: signatureBase64,
                    },
                    type: apiType,
                    requestId: websiteInitiated?.initiated?.requestId
                });

                window.close();
            } catch (e) {
                toast.error('Failed to generate signature.');
            }
        }

        const websiteInitiatedHandlers = {
            [WALLET_TYPES.WALLET_SIGN_REQUEST]: async () => {
                try {
                    await EXECUTE_API({
                        data: { ...userDetails },
                        type: WALLET_TYPES.WALLET_SIGN_RESPONSE,
                        requestId: websiteInitiated?.initiated?.requestId
                    });
                    setWebsiteInitiated(null);
                    window.close();

                } catch (e) {
                    
                }
            },
            [WALLET_TYPES.WALLET_ARBITRARY_REQUEST]: () => {
                return handleSignature(WALLET_TYPES.WALLET_ARBITRARY_REQUEST, WALLET_TYPES.WALLET_ARBITRARY_RESPONSE);
            },
            [WALLET_TYPES.INITIATE_CONTRACT]: () => {
                return handleWebsiteInitiated(WALLET_TYPES.INITIATE_CONTRACT, WALLET_TYPES.EXECUTE_CONTRACT);
            },
            [WALLET_TYPES.DEPLOY_NFT]: () => {
                return handleWebsiteInitiated(WALLET_TYPES.DEPLOY_NFT, WALLET_TYPES.INITIATE_DEPLOY_NFT);
            },
            [WALLET_TYPES.TRANSFER_FT]: () => {
                return handleWebsiteInitiated(WALLET_TYPES.TRANSFER_FT, WALLET_TYPES.INITIATE_TRANSFER_FT);
            },
            [WALLET_TYPES.EXECUTE_NFT]: () => {
                return handleWebsiteInitiated(WALLET_TYPES.EXECUTE_NFT, WALLET_TYPES.INITIATE_EXECUTE_NFT);
            },
            [WALLET_TYPES.CREATE_FT]: () => {
                return handleWebsiteInitiated(WALLET_TYPES.CREATE_FT, WALLET_TYPES.INITIATE_CREATE_FT);
            },
            [WALLET_TYPES.EXECUTE_CONTRACT]: () => {
                return handleWebsiteInitiated(WALLET_TYPES.EXECUTE_CONTRACT, WALLET_TYPES.EXECUTE_CONTRACT);
            }
        };

        if (websiteInitiated?.initiated?.type && websiteInitiatedHandlers[websiteInitiated.initiated.type]) {
            await websiteInitiatedHandlers[websiteInitiated.initiated.type]();
        }
    };

    const onClickClose = () => {
        setWebsiteInitiated(null);
        window.close();
    };

    return (
        <div
            className="flex flex-col items-center p-5 justify-between"
            style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                width: 390,
                height: 550
            }}
        >
            {/* Main Content */}
            <main className="flex flex-1 flex-col items-center w-full">
                {/* Top bar with site icon + title */}
                <div className="flex items-center justify-between p-4 w-full">
                    <div className="flex items-center gap-2">
                        <img src={websiteInitiated?.icon} alt="website icon" className="w-6 h-6 rounded" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{websiteInitiated?.title}</span>
                    </div>
                </div>

                {/* Title & Subtitle */}
                <div className="text-center mb-4 px-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {websiteInitiated?.initiated?.type === WALLET_TYPES.WALLET_SIGN_REQUEST
                            ? 'Connect to Site'
                            : 'Request'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {websiteInitiated?.initiated?.type === WALLET_TYPES.WALLET_SIGN_REQUEST
                            ? 'This site is requesting to connect to your wallet'
                            : 'Review the request details below'}
                    </p>
                </div>

                {/* Request Type */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 w-full">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Request Type:</span>
                        <span className="text-xs ms-1 font-medium text-gray-900 dark:text-white">
                            {websiteInitiated?.initiated?.type}
                        </span>
                    </div>
                </div>

                {/* Request Data */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 w-full max-h-48 overflow-auto">
                    <div className="space-y-3 break-words">
                        {(() => {
                            const raw = websiteInitiated?.initiated?.data;
                            if (typeof raw === 'string') {
                                return <div style={{ overflowX: 'auto' }}>{raw}</div>;
                            }

                            // Function to flatten nested objects and parse JSON strings
                            const flattenObject = (obj, prefix = '') => {
                                const flattened = {};
                                
                                Object.keys(obj).forEach(key => {
                                    const value = obj[key];
                                    const newKey = prefix ? `${prefix}.${key}` : key;
                                    
                                    // Try to parse if it's a JSON string
                                    let processedValue = value;
                                    if (typeof value === 'string') {
                                        try {
                                            // Check if it looks like JSON
                                            if ((value.startsWith('{') && value.endsWith('}')) || 
                                                (value.startsWith('[') && value.endsWith(']'))) {
                                                processedValue = JSON.parse(value);
                                            }
                                        } catch {
                                            // Not valid JSON, keep as string
                                        }
                                    }
                                    
                                    if (typeof processedValue === 'object' && processedValue !== null && !Array.isArray(processedValue)) {
                                        Object.assign(flattened, flattenObject(processedValue, newKey));
                                    } else {
                                        flattened[newKey] = processedValue;
                                    }
                                });
                                
                                return flattened;
                            };

                            // Process the data
                            let processedData = { ...(raw || {}) };
                            
                            // Parse and flatten smartContractData if present
                            if (typeof raw.smartContractData === 'string') {
                                try {
                                    const parsed = JSON.parse(raw.smartContractData);
                                    // Flatten any nested objects in the parsed data
                                    const flattened = flattenObject(parsed);
                                    Object.assign(processedData, flattened);
                                } catch { }
                                delete processedData.smartContractData;
                            }
                            
                            // Fix for missing receiver field in NFT execution
                            if (websiteInitiated?.initiated?.type === WALLET_TYPES.EXECUTE_NFT && processedData.nft_data && !processedData.receiver) {
                                // Extract receiver from nft_data if it contains a DID
                                const nftDataStr = String(processedData.nft_data);
                                const didMatch = nftDataStr.match(/bafy[a-zA-Z0-9]{50,}/);
                                if (didMatch) {
                                    processedData.receiver = didMatch[0];
                                }
                            }
                            
                            // Flatten any remaining nested objects
                            const flatData = flattenObject(processedData);

                            return (
                                <div
                                    style={{
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        paddingRight: '8px',
                                    }}
                                >
                                    {Object.entries(flatData).map(([key, value]) => {
                                        // Remove common prefixes for cleaner display
                                        let displayKey = key
                                            .replace(/^publish_asset\./, '')
                                            .replace(/^asset_metadata\./, '');
                                        
                                        return (
                                            <div
                                                key={key}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '8px',
                                                    width: '100%',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: '600',
                                                        width: '40%',
                                                        paddingRight: '10px',
                                                        wordBreak: 'break-word',
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                    }}
                                                >
                                                    <span>{displayKey}</span>
                                                    <span>:</span>
                                                </div>
                                                <div
                                                    style={{
                                                        width: '60%',
                                                        wordBreak: 'break-word',
                                                        paddingLeft: '10px',
                                                    }}
                                                >
                                                    {Array.isArray(value) 
                                                        ? value.join(', ')
                                                        : String(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}



                    </div>
                </div>
            </main>

            {/* Action Buttons */}
            <div className="flex w-full justify-between pb-6">
                <button
                    onClick={handleConnect}
                    className="text-white bg-secondary w-[45%] text-base font-bold py-2.5 px-4 rounded-lg transition-colors"
                >
                    {websiteInitiated?.initiated?.type === WALLET_TYPES.WALLET_SIGN_REQUEST ? 'Connect' : 'Confirm'}
                </button>
                <button
                    onClick={onClickClose}
                    className="text-gray-900 border w-[45%] text-base border-secondary font-bold py-2.5 px-4 rounded-lg transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default Requests;
