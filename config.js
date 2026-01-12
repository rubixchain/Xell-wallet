const CONFIG_API_URL = 'https://assets.xellwallet.com/config.json';

export const config = {
    RUBIX_MAINNET_BASE_URL: 'http://localhost:3000',
    RUBIX_TESTNET_BASE_URL: null,
    TRIE_TESTNET_BASE_URL: null,
    TRIE_MAINNET_BASE_URL: null,
    RUBIX_TESTNET_TXN_LINK: null,
    RUBIX_MAINNET_TXN_LINK: null,
    TRIE_TESTNET_TXN_LINK: null,
    RUBIX_TESTNET_FAUCET_LINK: null,
    TRIE_TESTNET_FAUCET_LINK: null,
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
            const { RUBIX_MAINNET_BASE_URL, ...otherUrls } = data.URLS;
            Object.assign(config, otherUrls);
        }
        if (data.ALLOWED_ORIGINS) {
            config.ALLOWED_ORIGINS = data.ALLOWED_ORIGINS;
        }

    } catch {
        // Silently fail if config cannot be loaded
    }
}

// Function to get config promise
export function getConfigPromise() {
    if (!configLoadedPromise) {
        configLoadedPromise = loadConfig();
    }
    return configLoadedPromise;
}

// Load config immediatelya
loadConfig();

export const NETWORK_TYPES = {
    RBT: 'RBT',
    TRI: 'TRI',
    TRIE: 'TRIE',
};











