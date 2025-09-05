import { secp256k1 } from "@noble/curves/secp256k1";
import toast from "react-hot-toast";
import indexDBUtil from "./indexDB";
import { config, NETWORK_TYPES } from "../config";

export async function convertCurrency(amount, fromCurrency, toCurrency) {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();

        // Convert to USD first (if not already USD)
        const usdAmount = fromCurrency === 'USD'
            ? amount
            : amount / data.rates[fromCurrency];
        // Convert from USD to target currency
        const convertedAmount = usdAmount * data.rates[toCurrency];
        return convertedAmount.toFixed(2);
    } catch (error) {

    }
}


function stringToByteArray(str) {
    return new Uint8Array([...str].map((char) => char.charCodeAt(0)));
}

export const generateSignature = async (privKeyStr, message) => {
    try {
        // Create byte array from base64 string using browser-native APIs

        let messagebyteArray;

        // Attempt to use TextEncoder/Decoder approach first
        try {
            // Decode base64 to string
            const decodedStr = atob(message);
            // Convert string to Uint8Array
            messagebyteArray = new Uint8Array(decodedStr.length);
            for (let i = 0; i < decodedStr.length; i++) {
                messagebyteArray[i] = decodedStr.charCodeAt(i);
            }
        } catch (err) {

            throw new Error("Base64 decode failed");
        }

        // Force synchronous execution with try-catch to ensure all operations complete
        try {
            const signature = secp256k1.sign(messagebyteArray, privKeyStr);
            const signatureDER = signature.toDERRawBytes();
            return Array.from(signatureDER);
        } catch (signingErr) {

            throw signingErr;
        }
    } catch (error) {

        throw error; // Re-throw to ensure caller knows about the failure
    }
};

export const EXECUTE_API = async (data) => {
    const isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
    try {
        if (isFirefox) {
            const response = await browser.runtime.sendMessage({ ...data });
            return response;
        } else {
            const response = await chrome.runtime.sendMessage({ ...data });
            return response;
        }
    } catch (err) {
        toast.error("Error sending message");
        return false;
    }
};

export const updateVersion = async (version = 4) => {
    const currentVersion = await indexDBUtil.getCurrentVersion();

    if ((!currentVersion || !currentVersion?.version) && version == 3) {
        await indexDBUtil.setCurrentVersion(version);
        let res = await indexDBUtil.getData("UserDetails");
        if (!res?.status || !res?.data?.length) {
            return
        }
        if (res?.status) {
            res?.data?.forEach(async (item) => {
                await indexDBUtil.storeExistingNetworks(item?.did);
            });
        }
        await indexDBUtil.updateUserAccountNetwork(3)

        const networkMappings = {
            "1": {
                network: "1",
                RPCUrl: config?.RUBIX_MAINNET_BASE_URL,
                name: "Rubix Mainnet",
                tokenSymbol: NETWORK_TYPES.RBT
            },
            "2": {
                network: "2",
                RPCUrl: config?.RUBIX_TESTNET_BASE_URL,
                name: "Rubix Testnet",
                tokenSymbol: NETWORK_TYPES.RBT
            },
            "3": {
                network: "3",
                RPCUrl: config?.TRIE_TESTNET_BASE_URL,
                name: "Trie Testnet",
                tokenSymbol: NETWORK_TYPES.TRIE
            },
            "4": {
                network: "4",
                RPCUrl: config?.TRIE_MAINNET_BASE_URL,
                name: "Trie Mainnet",
                tokenSymbol: NETWORK_TYPES.TRI
            }
        };

        const getcurrentNetwork = await indexDBUtil.getNetworkSetting();
        const networkConfig = networkMappings[getcurrentNetwork?.network || "3"] || networkMappings["3"];
        await indexDBUtil.storeNetworkSetting(networkConfig);

    }

    if (currentVersion?.version == 3 && version == 4) {
        await indexDBUtil.setCurrentVersion(version);
        await indexDBUtil.updateNetwork();
    }
}

export function isSignatureRoundRequired(result) {
    return (
        result &&
        typeof result === 'object' &&
        result.id &&
        result.hash
    );
}

