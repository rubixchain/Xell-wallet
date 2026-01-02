
const CONFIG_API_URL = 'https://assets.xellwallet.com/config.json';

export const config = {
    RUBIX_MAINNET_BASE_URL: 'http://localhost:3000',
    RUBIX_TESTNET_BASE_URL: 'http://localhost:3000',
    TRIE_TESTNET_BASE_URL: 'http://localhost:3000',
    TRIE_MAINNET_BASE_URL: 'http://localhost:3000',
    RUBIX_TESTNET_TXN_LINK: 'http://localhost:3000',
    RUBIX_MAINNET_TXN_LINK: 'http://localhost:3000',
    TRIE_TESTNET_TXN_LINK: 'http://localhost:3000',
    RUBIX_TESTNET_FAUCET_LINK: 'http://localhost:3000',
    TRIE_TESTNET_FAUCET_LINK: 'http://localhost:3000',
    TESTNETS: [2, 3],
    MAINNETS: [1, 4],
    ALLOWED_ORIGINS: []
};

// Create a promise that resolves when config is loaded
let configLoadedPromise = null;

async function loadConfig() {
    // Disabled remote config loading for local development
    // Using localhost:3000 for all network URLs
    return;
}

// Function to get config promise
export function getConfigPromise() {
    if (!configLoadedPromise) {
        configLoadedPromise = loadConfig();
    }
    return configLoadedPromise;
}

// Load config immediately
loadConfig();

export const NETWORK_TYPES = {
    RBT: 'RBT',
    TRI: 'TRI',
    TRIE: 'TRIE',
};

