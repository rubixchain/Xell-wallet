import api from "./axios"
import axios from 'axios'

// Proxy server URL for DID migration balance transfers
const PROXY_SERVER_URL = 'http://localhost:3000';

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
    get_account_info: (did) => {
        return api.get(`rubix/v1/dids/${did}/balances/rbt`)
    },
    get_nfts_info: (params) => {
        return api.get('get-nfts-by-did', { params })
    },
    get_ft_info: (params) => {
        return api.get('get-ft-info-by-did', { params })
    },
    get_transactions_info: (params) => {
        return api.get('get-by-did', { params })
    },
    transfer_rtbt: (params) => {
        return api.post('initiate-rbt-transfer', params)
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
        return api.post('initiate-ft-transfer', data)
    },
    create_ft: (data) => {
        return api.post('create-ft', data)
    },
    get_network_details: () => {
        return api.get('getalldid')
    },
    get_ft_txn_by_did: (params) => {
        return api.get('get-ft-txn-by-did', { params })
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

