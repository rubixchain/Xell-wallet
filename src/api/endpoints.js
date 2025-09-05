import api from "./axios"


export const END_POINTS = {
    register_did: (params) => {
        return api.post('register-did', params)
    },
    signature_response: (params) => {
        return api.post('signature-response', params)
    },
    create_wallet: (params) => {
        return api.post('request-did-for-pubkey', params)
    },
    get_account_info: (params) => {
        return api.get('get-account-info', { params })
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
    }

}

