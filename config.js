
const CONFIG_API_URL = 'https://assets.xellwallet.com/config.json';

export const config = {
    RUBIX_MAINNET_BASE_URL: '',
    RUBIX_TESTNET_BASE_URL: '',
    TRIE_TESTNET_BASE_URL: '',
    TRIE_MAINNET_BASE_URL: '',
    RUBIX_TESTNET_TXN_LINK: '',
    RUBIX_MAINNET_TXN_LINK: '',
    TRIE_TESTNET_TXN_LINK: '',
    RUBIX_TESTNET_FAUCET_LINK: '',
    TRIE_TESTNET_FAUCET_LINK: '',
    TESTNETS: [2, 3],
    MAINNETS: [1, 4],
    ALLOWED_ORIGINS: []
};

// Create a promise that resolves when config is loaded
let configLoadedPromise = null;

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_API_URL);
        const data = await response.json();
        if (data.URLS) {
            Object.keys(data.URLS).forEach(key => {
                config[key] = data.URLS[key];
            });
        }
        if (data.ALLOWED_ORIGINS) {
            config.ALLOWED_ORIGINS = data.ALLOWED_ORIGINS;
        }
    } catch (error) {
    }
}

// Function to get config promise
export function getConfigPromise() {
    if (!configLoadedPromise) {
        configLoadedPromise = loadConfig();
    }
    return configLoadedPromise;
}

configLoadedPromise = loadConfig();

export const NETWORK_TYPES = {
    RBT: 'RBT',
    TRI: 'TRI',
    TRIE: 'TRIE',
};