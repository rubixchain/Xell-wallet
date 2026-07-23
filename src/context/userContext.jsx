import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../utils/constants";
import { WALLET_TYPES } from "../enums";
import indexDBUtil from "../indexDB";
import toast from "react-hot-toast";
import { config, NETWORK_TYPES } from "../../config";

export const UserContext = createContext()

export const UserProvider = ({ children }) => {
    const navigate = useNavigate()
    const [userDetails, setUserDetails] = useState({})
    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false)
    const [autoLockTime, setAutoLockTime] = useState(0);
    const [currency, setCurrency] = useState('$ USD - US Dollar');
    const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
    const [websiteInitiated, setWebsiteInitiated] = useState(null)
    const [selectedTokens, setSelectedTokens] = useState([])
    const [isInitializing, setIsInitializing] = useState(true)

    useEffect(() => {
        (async () => {
            try {
                let res = localStorage.getItem("logginTimeOut")
                setAutoLockTime(JSON.parse(res) || 5)
                let result = localStorage.getItem('currency')

            let value
            if (!result) {
                value = { label: '$ USD - US Dollar', value: 'USD' }
            }
            else {
                value = JSON.parse(result)

            }
            setCurrency(value)

            // One-time cleanup of pre-merge network data (drops TRIE networks,
            // remaps ids to the two Rubix networks). Idempotent and non-fatal.
            await indexDBUtil.migrateNetworkIds()

            let currentUser = localStorage.getItem("currentUser")

            // Check if running in browser extension context
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(["websiteInitiated", "title", "icon"], (result) => {
                    if (result?.websiteInitiated) {
                        setWebsiteInitiated({
                            initiated: result?.websiteInitiated || {},
                            title: result?.title || '',
                            icon: result?.icon || ''
                        });
                        chrome.storage.local.remove(["websiteInitiated", "title", "icon"], () => {

                        });
                    }
                });
            }
            if (!currentUser) {
                setIsInitializing(false);
                navigate(ROUTES.WELCOME, { replace: true })
                return
            }
            currentUser = JSON.parse(currentUser)

            let checkUser;
            // Check if running in browser extension context
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                checkUser = await chrome.runtime.sendMessage(
                    { type: WALLET_TYPES.GET_USER_DETAILS }
                )
            } else {
                // Fallback for dev mode (not in extension context)
                // Get user details from IndexedDB directly
                try {
                    const userData = await indexDBUtil.getData("UserDetails", currentUser.username, currentUser.pin);
                    if (userData) {
                        checkUser = {
                            status: true,
                            userDetails: {
                                username: userData.username,
                                did: userData.did,
                                network: userData.network,
                                publickey: userData.publickey,
                                pin: userData.pin,
                                legacyDid: userData.legacyDid || null
                            }
                        };
                    }
                } catch (error) {
                    // Error fetching user details
                }
            }

            if (!checkUser || !checkUser?.status || currentUser.username !== checkUser.userDetails?.username) {
                // Background script may have been terminated - try fetching from IndexedDB directly
                try {
                    const hasUnified = await indexDBUtil.hasUnifiedPassword();
                    if (hasUnified && currentUser.username) {
                        // Try to get user details from IndexedDB with the stored username
                        // Note: We don't have the password here, so we'll need to redirect to login
                        setIsInitializing(false);
                        navigate(ROUTES.LOGIN, { replace: true })
                        return
                    }
                } catch (error) {
                    // Error checking - redirect to login
                }
                setIsInitializing(false);
                navigate(ROUTES.LOGIN, { replace: true })
                return
            }
            setIsUserLoggedIn(true)

            setUserDetails(currentUser)
            setUserDetails(checkUser?.userDetails)

            await indexDBUtil.ensureDefaultNetworksForDID(checkUser?.userDetails?.did);

            let getActivenetwork = await indexDBUtil.getNetworksByDID(checkUser?.userDetails?.did) || []
            getActivenetwork = getActivenetwork?.find(item => item?.selected)
            if (getActivenetwork) {
                getActivenetwork = {
                    network: getActivenetwork?.id,
                    RPCUrl: getActivenetwork?.rpcUrls?.find(item => item?.selected)?.url,
                    name: getActivenetwork?.name,
                    tokenSymbol: getActivenetwork?.tokenSymbol
                }
            } else {
                // Fallback: Use the network from userDetails if no active network is found
                // This handles the case when wallet is first created
                const fallbackNetwork = checkUser?.userDetails?.network || 1;
                getActivenetwork = {
                    network: fallbackNetwork,
                    RPCUrl: fallbackNetwork === 1 ? config?.RUBIX_MAINNET_BASE_URL : config?.RUBIX_TESTNET_BASE_URL,
                    name: fallbackNetwork === 1 ? "Rubix Mainnet" : "Rubix Testnet",
                    tokenSymbol: NETWORK_TYPES.RBT
                };
            }
            
            // Update userDetails with the correct network information
            setUserDetails(prev => ({
                ...prev,
                network: getActivenetwork?.network,
                tokenSymbol: getActivenetwork?.tokenSymbol
            }));
            
            indexDBUtil.storeNetworkSetting({
                network: getActivenetwork?.network,
                RPCUrl: getActivenetwork?.RPCUrl,
                name: getActivenetwork?.name,
                tokenSymbol: getActivenetwork?.tokenSymbol
            })

            setIsInitializing(false);
            navigate(ROUTES.DASHBOARD, { replace: true })
            } catch (error) {
                setIsInitializing(false);
                navigate(ROUTES.LOGIN, { replace: true })
            }
        })()
    }, [])
    const values = {
        userDetails,
        setUserDetails,
        isUserLoggedIn,
        setIsUserLoggedIn,
        autoLockTime,
        setAutoLockTime,
        currency,
        setCurrency,
        selectedNetwork,
        setSelectedNetwork,
        websiteInitiated,
        setWebsiteInitiated,
        setSelectedTokens,
        selectedTokens
    }
    return (
        <UserContext.Provider value={values}>
            {isInitializing ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '600px', width: '390px' }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : children}
        </UserContext.Provider>
    )
}