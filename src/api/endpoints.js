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

const mapTxToLegacyShape = (tx) => {
    const info = tx?.Info || {}
    const tokens = info?.tokens || {}
    const rbtAmount = sumTokenValues(tokens.rbt)
    const ftAmount = sumTokenValues(tokens.ft)
    const epoch = Number(info?.epoch) || toEpoch(tx?.CreatedAt)
    return {
        TransactionID: tx?.ID || '',
        SenderDID: info?.initiator || '',
        ReceiverDID: info?.owner || '',
        Amount: rbtAmount || ftAmount || 0,
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
        return api.get(`rubix/v1/dids/${did}/register`)
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
    transfer_rtbt: (params) => {
        const tokenCount = Number(params?.tokenCount ?? params?.tokenCOunt ?? 0)
        const body = {
            initiator: params?.sender,
            owner: params?.receiver,
            tokens: {
                rbt: tokenCount,
                ft: [],
                nft: [],
                smartContract: [],
                transferNftOwnership: false
            },
            memo: params?.comment || ''
        }
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
    initiate_ft_transfer: (data) => {
        const body = {
            initiator: data?.sender,
            owner: data?.receiver,
            tokens: {
                rbt: 0,
                ft: [{
                    ftName: data?.ft_name,
                    creatorDID: data?.creatorDID,
                    numberOfFts: Number(data?.ft_count) || 0
                }],
                nft: [],
                smartContract: [],
                transferNftOwnership: false
            },
            memo: data?.comment || ''
        }
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

