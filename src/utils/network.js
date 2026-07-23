import { config } from '../../config';

// After the TRIE/Rubix merge there are only two networks, both Rubix. Each one
// serves the native RBT balance AND fungible tokens (FTs) from the same node,
// so the app no longer branches "RBT network vs FT network" — it always shows
// both. These helpers centralise the remaining per-network bits (ids, explorer
// links) so the old scattered `network == 1/2/3/4` checks have one home.
export const NETWORK_IDS = {
    RUBIX_MAINNET: 1,
    RUBIX_TESTNET: 2,
};

export const isRubixNetwork = (id) =>
    Number(id) === NETWORK_IDS.RUBIX_MAINNET || Number(id) === NETWORK_IDS.RUBIX_TESTNET;

// Block-explorer base for a given network id (testnet vs mainnet).
export const getTxnExplorerLink = (network) =>
    Number(network) === NETWORK_IDS.RUBIX_TESTNET
        ? config.RUBIX_TESTNET_TXN_LINK
        : config.RUBIX_MAINNET_TXN_LINK;

// Build the final explorer URL for a transaction id, handling both URL formats:
// hash routing (ends with "/") appends the id directly; query routing uses ?tx=.
export const buildTxnExplorerUrl = (network, id) => {
    const link = getTxnExplorerLink(network);
    if (!link) return '';
    return link.endsWith('/') ? `${link}${id}` : `${link}?tx=${id}`;
};
