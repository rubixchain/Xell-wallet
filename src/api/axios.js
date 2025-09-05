
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { config, getConfigPromise } from '../../config';
import indexDBUtil from '../indexDB';

const getBaseURL = async () => {
    // Wait for config to be loaded first
    await getConfigPromise();

    const networkStorage = await indexDBUtil.getNetworkSetting()
    if (!networkStorage || networkStorage?.network == 1) {
        return config.RUBIX_MAINNET_BASE_URL
    }
    if (networkStorage?.network == 2) {
        return config.RUBIX_TESTNET_BASE_URL
    }
    if (networkStorage?.network == 3) {
        return config.TRIE_TESTNET_BASE_URL
    }
    if (networkStorage?.network == 4) {
        return config.TRIE_MAINNET_BASE_URL
    }
    return networkStorage?.RPCUrl
};




// Create axios instance with default config
const api = axios.create({
    timeout: 300000, // 5 minutes timeout
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    async (config) => {
        let baseURL = await getBaseURL()
      
        config.baseURL = baseURL

        if (config.data instanceof FormData) {
            config.headers['accept'] = 'multipart/form-data';
            config.headers["Content-Type"] = ' multipart/form-data'
        }
        return config;
    },
    (error) => {
        // Handle request errors
      
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Handle successful responses
        return response?.data;
    },
    async (error) => {

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401) {
            // Clear auth state and redirect to login
            return Promise.reject(error);
        }

        // Handle 403 Forbidden errors
        if (error.response?.status === 403) {
            toast.dismiss();
            toast.error('You do not have permission to perform this action', { position: 'top-center' });
            return Promise.reject(error);
        }

        // Handle 404 Not Found errors
        if (error.response?.status === 404) {
            toast.dismiss();
            toast.error('Resource not found', { position: 'top-center' });
            return Promise.reject(error);
        }
        if (error.response?.status === 504) {
            toast.dismiss();
            toast.error('The server is taking too long to respond. Please try again later.', { position: 'top-center' });
            return Promise.reject(error);
        }

        // Handle 422 Validation errors
        if (error.response?.status === 422) {
            const validationErrors = error.response.data?.errors;
            if (validationErrors) {
                Object.values(validationErrors).forEach((error) => {
                    toast.dismiss();
                    toast.error(error[0]);
                });
            }
            return Promise.reject(error);
        }

        // Handle network errors
        if (error.message === 'Network Error') {
            toast.dismiss();
            toast.error('Network error.', { position: 'top-center' });
            return Promise.reject(error);
        }

        // Handle timeout errors
        if (error.code === 'ECONNABORTED') {
            toast.dismiss();
            toast.error('Request timed out. Please try again.', { position: 'top-center' });
            return Promise.reject(error);
        }
        // Handle other errors
        toast.dismiss();
        // Remove error codes and 'with status' from message
        let userMessage = error?.response?.data?.message || 'An unexpected error occurred';
        userMessage = userMessage.replace(/(code\s*\d{3})/gi, '').replace(/\d{3}/g, '').replace(/with status.*$/i, '').replace(/\s+/g, ' ').trim();
        if (/request failed/i.test(userMessage)) userMessage = 'Request failed';
        toast.error(userMessage, { position: 'top-center' });
        return Promise.reject(error);
    }
);

export default api;
