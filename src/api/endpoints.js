import api from "./axios"
import axios from 'axios'

// Proxy server URL for DID migration balance transfers
const PROXY_SERVER_URL = 'http://localhost:3000';

const toEpoch = (value) => {
    if (!value) return 0
    const parsed = typeof value === 'number' ? value : new Date(value).getTime()
    if (!parsed || Number.isNaN(parsed)) return 0
    return Math.floor(parsed / 1000)
}

const sumTokenValues = (tokens) => {
    if (!Array.isArray(tokens)) return 0
    return tokens.reduce((sum, t) => sum + (Number(t?.tokenValue) || 0), 0)
}

// FT tokens in a transaction carry a `tokenId` shaped like
// "<ftName>_<creatorDID>_<n>" (e.g. "xell-ft_bafy...kaqq_1"). The creatorDID
// and trailing index are the last two underscore segments, so the FT name is
// everything before them — which also tolerates names containing underscores.
const ftNameFromToken = (t) => {
    const id = t?.tokenId
    if (typeof id === 'string' && id.includes('_')) {
        const parts = id.split('_')
        return parts.length >= 3 ? parts.slice(0, -2).join('_') : parts[0]
    }
    return t?.ftName || t?.FTName || t?.name || null
}

// Break a transaction down into the individual assets it moved, each with its
// own amount: RBT uses its summed value; every distinct FT uses the COUNT of
// its tokens. Drives the expandable multi-asset row in the history.
const buildAssets = (tokens, rbtAmount) => {
    const assets = []
    if (rbtAmount) assets.push({ symbol: 'RBT', amount: rbtAmount })
    const ftTokens = Array.isArray(tokens?.ft) ? tokens.ft : []
    const counts = {}
    for (const t of ftTokens) {
        const name = ftNameFromToken(t) || 'FT'
        counts[name] = (counts[name] || 0) + 1
    }
    for (const [symbol, amount] of Object.entries(counts)) {
        assets.push({ symbol, amount })
    }
    return assets
}

// Derive a human-readable asset symbol for a transaction from its tokens.
// RBT-only -> "RBT"; a single FT -> that FT's name; a combined transfer ->
// the parts joined (e.g. "RBT + TRIE"). Returns null when nothing is found.
const deriveSymbol = (tokens, rbtAmount, ftCount) => {
    const ftTokens = Array.isArray(tokens?.ft) ? tokens.ft : []
    const ftNames = [...new Set(
        ftTokens.map(ftNameFromToken).filter(Boolean)
    )]
    const parts = []
    if (rbtAmount) parts.push('RBT')
    if (ftNames.length) parts.push(...ftNames)
    if (parts.length) return parts.join(' + ')
    if (rbtAmount) return 'RBT'
    if (ftCount) return ftNames[0] || 'FT'
    return null
}

const mapTxToLegacyShape = (tx) => {
    const info = tx?.Info || {}
    const tokens = info?.tokens || {}
    const rbtAmount = sumTokenValues(tokens.rbt)
    // For FTs we show the NUMBER of tokens transferred (each entry in tokens.ft
    // is one FT), not the summed token value.
    const ftCount = Array.isArray(tokens.ft) ? tokens.ft.length : 0
    const epoch = Number(info?.epoch) || toEpoch(tx?.CreatedAt)
    return {
        TransactionID: tx?.ID || '',
        SenderDID: info?.initiator || '',
        ReceiverDID: info?.owner || '',
        Amount: rbtAmount || ftCount || 0,
        // Per-transaction asset label so the history can show which token moved
        // (RBT / TRIE / E-Coin) instead of a single global symbol.
        Symbol: deriveSymbol(tokens, rbtAmount, ftCount),
        // Full per-asset breakdown for multi-asset transactions (expandable row).
        Assets: buildAssets(tokens, rbtAmount),
        Epoch: epoch,
        DateTime: tx?.CreatedAt || '',
        Comment: info?.memo || '',
        Mode: 0,
        Status: true
    }
}

const normalizeTxHistoryResponse = (response) => {
    if (!response || response.status !== true) return response
    const result = Array.isArray(response.result) ? response.result : []
    return { ...response, TxnDetails: result.map(mapTxToLegacyShape) }
}

const normalizeFtInfoResponse = (response) => {
    if (!response || response.status !== true) return response
    const result = Array.isArray(response.result) ? response.result : []
    const ftInfo = result.map(ft => ({
        ft_name: ft.name,
        creator_did: ft.creator,
        ft_count: ft.count,
        ft_value: ft.value
    }))
    return { ...response, ft_info: ftInfo }
}

export const END_POINTS = {
    register_did: (did) => {
        return api.post(`rubix/v1/dids/${did}/register`)
    },
    signature_response: (params) => {
        return api.post('rubix/v1/signature', params)
    },
    create_wallet: (params) => {
        return api.post('rubix/v1/dids/create', params)
    },
    get_rbt_balance: (did) => {
        return api.get(`rubix/v1/dids/${did}/balances/rbt`)
    },
    get_nfts_info: (params) => {
        return api.get('get-nfts-by-did', { params })
    },
    get_ft_balance: async (params) => {
        const did = params?.did || params?.DID
        const response = await api.get(`rubix/v1/dids/${did}/balances/ft`)
        return normalizeFtInfoResponse(response)
    },
    get_rbt_transactions: async (params) => {
        const did = params?.DID || params?.did
        const response = await api.get(`rubix/v1/tx/${did}/rbt`)
        return normalizeTxHistoryResponse(response)
    },
    transfer_rtbt: (body) => {
        return api.post('rubix/v1/tx', body)
    },
    get_rbt_data: async () => {
        // Analytics endpoint - modify this URL to point to your analytics API
        const analyticsUrl = 'https://rexplorerapi.azurewebsites.net/api/Analytics/GetKPIDetails';
        let res = await fetch(analyticsUrl)
        res = res?.json()
        return res
    },
    get_did: async (params) => {
        return api.post('get-did', params)
    },
    generate_smart_Contract: async (data) => {
        return api.post('generate-smart-contract', data)
    },
    deploy_smart_contract: async (data) => {
        return api.post('deploy-smart-contract', data)
    },
    execute_smart_contract: async (data) => {
        return api.post('execute-smart-contract', data)
    },
    create_nft: (data) => {
        return api.post('create-nft', data)
    },
    deploy_nft: (data) => {
        return api.post('deploy-nft', data)
    },
    execute_nft: (data) => {
        return api.post('execute-nft', data)
    },
    initiate_ft_transfer: (body) => {
        return api.post('rubix/v1/tx', body)
    },
    // Combined RBT + multi-FT transfer. Same endpoint as the single-asset calls
    // above; the node's tx handler processes the `rbt` and `ft` keys in `tokens`
    // independently, so one call can move RBT and several FTs at once.
    initiate_transfer: (body) => {
        return api.post('rubix/v1/tx', body)
    },
    create_ft: (data) => {
        return api.post('create-ft', data)
    },
    get_network_details: () => {
        return api.get('getalldid')
    },
    get_ft_transactions: async (params) => {
        const did = params?.DID || params?.did
        const response = await api.get(`rubix/v1/tx/${did}/ft`)
        return normalizeTxHistoryResponse(response)
    },

    // Proxy server endpoint for DID migration balance transfer
    initiate_proxy_rbt_transfer: async (data) => {
        const response = await axios.post(`${PROXY_SERVER_URL}/api/initiate-proxy-rbt-transfer`, data, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 600000 // 10 minutes - proxy transfers can take time
        });
        return response.data;
    }
}

