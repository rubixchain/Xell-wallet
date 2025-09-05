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
    useEffect(() => {
        (async () => {
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
            let currentUser = localStorage.getItem("currentUser")
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
            if (!currentUser) {
                navigate(ROUTES.WELCOME, { replace: true })
                return
            }
            currentUser = JSON.parse(currentUser)
            let checkUser = await chrome.runtime.sendMessage(
                { type: WALLET_TYPES.GET_USER_DETAILS }
            )


            if (!checkUser || !checkUser?.status || currentUser.username !== checkUser.userDetails?.username) {
                navigate(ROUTES.LOGIN, { replace: true })
                return
            }
            setIsUserLoggedIn(true)

            setUserDetails(currentUser)
            setUserDetails(checkUser?.userDetails)

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

            navigate(ROUTES.DASHBOARD, { replace: true })
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
            {children}
        </UserContext.Provider>
    )
}