import { config } from '../../config';
import { NETWORK_TYPES } from '../../config';

export const NETWORK_IDS = {
    RUBIX_MAINNET: '1',
    RUBIX_TESTNET: '2',
    TRIE_TESTNET: '3',
    TRIE_MAINNET: '4'
};

export const getRegistrationNetworks = () => [
    {
        id: NETWORK_IDS.RUBIX_MAINNET,
        name: 'RUBIX_MAINNET',
        baseUrl: config.RUBIX_MAINNET_BASE_URL
    },
    {
        id: NETWORK_IDS.RUBIX_TESTNET,
        name: 'RUBIX_TESTNET',
        baseUrl: config.RUBIX_TESTNET_BASE_URL
    },
    {
        id: NETWORK_IDS.TRIE_TESTNET,
        name: 'TRIE_TESTNET',
        baseUrl: config.TRIE_TESTNET_BASE_URL
    },
    {
        id: NETWORK_IDS.TRIE_MAINNET,
        name: 'TRIE_MAINNET',
        baseUrl: config.TRIE_MAINNET_BASE_URL
    }
];

export const getMigrationNetworks = () => [
    {
        id: NETWORK_IDS.RUBIX_MAINNET,
        baseUrl: config.RUBIX_MAINNET_BASE_URL
    }
];

export const getLegacyDIDCheckNetworks = () => [
    {
        id: NETWORK_IDS.RUBIX_MAINNET,
        baseUrl: config.RUBIX_MAINNET_BASE_URL
    }
];

export const getAvailableNetworksForStorage = () => [
    {
        logo: '/network/rubix.png',
        name: 'Rubix Mainnet',
        default: true,
        selected: true,
        tokenSymbol: NETWORK_TYPES.RBT,
        id: 1,
        rpcUrls: [
            {
                selected: true,
                name: 'mainnet',
                url: config.RUBIX_MAINNET_BASE_URL
            }
        ]
    },
    {
        logo: '/network/rubix.png',
        name: 'Rubix Testnet',
        default: true,
        selected: false,
        tokenSymbol: NETWORK_TYPES.RBT,
        id: 2,
        rpcUrls: [
            {
                selected: true,
                name: 'testnet',
                url: config.RUBIX_TESTNET_BASE_URL
            }
        ]
    },
    {
        logo: '/network/trie.png',
        name: 'Trie Testnet',
        default: true,
        selected: false,
        tokenSymbol: NETWORK_TYPES.TRIE,
        id: 3,
        rpcUrls: [
            {
                selected: true,
                name: 'testnet',
                url: config.TRIE_TESTNET_BASE_URL
            }
        ]
    },
    {
        logo: '/network/trie.png',
        name: 'Trie Mainnet',
        default: true,
        selected: false,
        tokenSymbol: NETWORK_TYPES.TRI,
        id: 4,
        rpcUrls: [
            {
                selected: true,
                name: 'mainnet',
                url: config.TRIE_MAINNET_BASE_URL
            }
        ]
    }
];

export const getExistingUserNetworks = () => [
    {
        logo: '/network/rubix.png',
        name: 'Rubix Mainnet',
        default: false,
        selected: false,
        tokenSymbol: NETWORK_TYPES.RBT,
        id: 1,
        rpcUrls: [
            {
                selected: true,
                name: 'mainnet',
                url: config.RUBIX_MAINNET_BASE_URL
            }
        ]
    },
    {
        logo: '/network/rubix.png',
        name: 'Rubix Testnet',
        default: false,
        selected: false,
        tokenSymbol: NETWORK_TYPES.RBT,
        id: 2,
        rpcUrls: [
            {
                selected: true,
                name: 'testnet',
                url: config.RUBIX_TESTNET_BASE_URL
            }
        ]
    },
    {
        logo: '/network/trie.png',
        name: 'Trie Testnet',
        default: false,
        selected: false,
        tokenSymbol: NETWORK_TYPES.TRIE,
        id: 3,
        rpcUrls: [
            {
                selected: true,
                name: 'testnet',
                url: config.TRIE_TESTNET_BASE_URL
            }
        ]
    },
    {
        logo: '/network/trie.png',
        name: 'Trie Mainnet',
        default: false,
        selected: false,
        tokenSymbol: NETWORK_TYPES.TRI,
        id: 4,
        rpcUrls: [
            {
                selected: true,
                name: 'mainnet',
                url: config.TRIE_MAINNET_BASE_URL
            }
        ]
    }
];
