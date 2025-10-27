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
            <main className="flex flex-1 flex-col items-center w-full">
                <div className="flex items-center justify-center w-full p-4 border-b border-gray-200 dark:border-gray-700">
                    <img 
                        src="/images/xell-wallet.svg" 
                        alt="Xell Wallet" 
                        className="w-16 h-16 bg-transparent" 
                        onError={(e) => {
                            e.target.src = "/images/android-chrome-192x192.png";
                        }}
                    />
                </div>

                <div className="flex items-center justify-center p-3 w-full bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <img src={websiteInitiated?.icon} alt="website icon" className="w-5 h-5 rounded" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Requested by:</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{websiteInitiated?.title}</span>
                    </div>
                </div>

                <div className="text-center mb-4 px-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {websiteInitiated?.initiated?.type === WALLET_TYPES.WALLET_SIGN_REQUEST
                            ? 'Connect to Site'
                            : 'Transaction Request'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {websiteInitiated?.initiated?.type === WALLET_TYPES.WALLET_SIGN_REQUEST
                            ? 'This site wants to connect to your Xell wallet'
                            : 'Review and approve this transaction request'}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 w-full">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Request Type:</span>
                        <span className="text-xs ms-1 font-medium text-gray-900 dark:text-white">
                            {websiteInitiated?.initiated?.type}
                        </span>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 w-full max-h-48 overflow-auto">
                    <div className="space-y-3 break-words">
                        {(() => {
                            const raw = websiteInitiated?.initiated?.data;
                            if (typeof raw === 'string') {
                                return <div style={{ overflowX: 'auto' }}>{raw}</div>;
                            }


                            const flattenObject = (obj, prefix = '') => {
                                const flattened = {};
                                
                                Object.keys(obj).forEach(key => {
                                    if (key === 'smartContractData') {
                                        return;
                                    }
                                    
                                    const value = obj[key];
                                    const newKey = prefix ? `${prefix}.${key}` : key;
                                    
                                    let processedValue = value;
                                    if (typeof value === 'string') {
                                        try {
                                            if ((value.startsWith('{') && value.endsWith('}')) || 
                                                (value.startsWith('[') && value.endsWith(']'))) {
                                                processedValue = JSON.parse(value);
                                            }
                                        } catch {
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

                            let processedData = { ...(raw || {}) };
                            
                            if (websiteInitiated?.initiated?.type === WALLET_TYPES.EXECUTE_NFT && processedData.nft_data && !processedData.receiver) {
                                const nftDataStr = String(processedData.nft_data);
                                const didMatch = nftDataStr.match(/bafy[a-zA-Z0-9]{50,}/);
                                if (didMatch) {
                                    processedData.receiver = didMatch[0];
                                }
                            }
                            
                            const flatData = flattenObject(processedData);
                            
                            if (raw.smartContractData) {
                                flatData.smartContractData = raw.smartContractData;
                            }

                            return (
                                <div
                                    style={{
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        paddingRight: '8px',
                                    }}
                                >
                                    {Object.entries(flatData).map(([key, value]) => {
                                        let displayKey = key
                                            .replace(/^publish_asset\./, '')
                                            .replace(/^asset_metadata\./, '')
                                            .replace(/^use_asset\./, '')
                                            .replace(/_/g, ' ')
                                            .replace(/\b\w/g, l => l.toUpperCase());
                                        
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

            <div className="flex w-full justify-between pb-6">
                <button
                    onClick={handleConnect}
                    className="text-white bg-primary w-[45%] text-base font-bold py-2.5 px-4 rounded-lg transition-colors hover:bg-primary-light flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {websiteInitiated?.initiated?.type === WALLET_TYPES.WALLET_SIGN_REQUEST ? 'Connect' : 'Confirm'}
                </button>
                <button
                    onClick={onClickClose}
                    className="text-gray-900 border w-[45%] text-base border-primary font-bold py-2.5 px-4 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white dark:border-gray-600"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default Requests;
