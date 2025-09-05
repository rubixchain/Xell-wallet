// Xell Wallet Injection Script
(function () {
    'use strict';

    const CONFIG = {
        TIMEOUT_DURATION: 300000, // 5 minutes
        TARGET_NAME: 'xell-extension',
        MESSAGE_TYPES: {
            WALLET_SIGN_REQUEST: 'WALLET_SIGN_REQUEST',
            WALLET_SIGN_RESPONSE: 'WALLET_SIGN_RESPONSE',
            WALLET_ARBITRARY_REQUEST: 'WALLET_ARBITRARY_REQUEST',
            WALLET_ARBITRARY_RESPONSE: 'WALLET_ARBITRARY_RESPONSE',
            EXECUTE_CONTRACT: 'EXECUTE_CONTRACT',
            INITIATE_CONTRACT: 'INITIATE_CONTRACT',
            DEPLOY_NFT: 'DEPLOY_NFT',
            INITIATE_DEPLOY_NFT: 'INITIATE_DEPLOY_NFT',
            EXECUTE_NFT: 'EXECUTE_NFT',
            INITIATE_EXECUTE_NFT: 'INITIATE_EXECUTE_NFT',
            TRANSFER_FT: 'TRANSFER_FT',
            INITIATE_TRANSFER_FT: 'INITIATE_TRANSFER_FT',
            EXECUTE_FT: 'EXECUTE_FT',
            CREATE_FT: 'CREATE_FT',
            INITIATE_CREATE_FT: 'INITIATE_CREATE_FT',
            STORE_USER_DETAILS: 'STORE_USER_DETAILS',
            GET_USER_DETAILS: 'GET_USER_DETAILS',
            CLEAR_USER_DETAILS: 'CLEAR_USER_DETAILS'
        }
    };

    let requestIdCounter = 0;

    function generateRequestId() {
        return `req_${Date.now()}_${++requestIdCounter}`;
    }

    function createTimeoutPromise(requestId, timeoutMs = CONFIG.TIMEOUT_DURATION) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                if (pendingPromises.has(requestId)) {
                    pendingPromises.delete(requestId);
                }
            }, timeoutMs);
        });
    }

    function dispatchWalletEvent(type, requestId, data = {}) {
        const event = new CustomEvent('xellTrigger', {
            detail: { type, requestId, data }
        });
        window.dispatchEvent(event);
    }

    const pendingPromises = new Map();

    function storePromise(requestId, resolve, reject) {
        pendingPromises.set(requestId, { resolve, reject });
    }

    function resolvePromise(requestId, result) {
        const promiseData = pendingPromises.get(requestId);
        if (promiseData) {
            pendingPromises.delete(requestId);
            if (result.error) {
                promiseData.reject(new Error(result.error));
            } else {
                // Include status and data in the resolved promise
                const response = {
                    status: result?.status || false,
                    data: result.data || result
                };
                promiseData.resolve(response);
            }
        }
    }

    function createWalletMethod(methodName, messageType, defaultData = {}) {
        return function (data = {}) {
            return new Promise((resolve, reject) => {
                const requestId = generateRequestId();

                storePromise(requestId, resolve, reject);
                createTimeoutPromise(requestId);

                dispatchWalletEvent(messageType, requestId, { ...defaultData, ...data });
            });
        };
    }

    window.xell = {
        // Core wallet methods
        signIn: createWalletMethod('signIn', CONFIG.MESSAGE_TYPES.WALLET_SIGN_REQUEST, {
            message: 'Sign in to connect your wallet'
        }),

        request: createWalletMethod('request', CONFIG.MESSAGE_TYPES.WALLET_ARBITRARY_REQUEST),

        // Contract operations
        executeContract: createWalletMethod('executeContract', CONFIG.MESSAGE_TYPES.INITIATE_CONTRACT),
        deployNFT: createWalletMethod('deployNFT', CONFIG.MESSAGE_TYPES.DEPLOY_NFT),
        transferFT: createWalletMethod('transferFT', CONFIG.MESSAGE_TYPES.TRANSFER_FT),
        createFT: createWalletMethod('createFT', CONFIG.MESSAGE_TYPES.CREATE_FT),
        executeNFT: createWalletMethod('executeNFT', CONFIG.MESSAGE_TYPES.EXECUTE_NFT),

        // Promise resolution (internal use)
        resolvePromise,

        // Legacy compatibility
        trigger: function (data) {
            const event = new CustomEvent('xellTrigger', { detail: data });
            window.dispatchEvent(event);
        },

        // Response handler
        handleResponse: function (requestId, result) {
            if (requestId && window.xell.resolvePromise) {
                window.xell.resolvePromise(requestId, result);
            }
        }
    };

    window.addEventListener('message', function (event) {
        // Security: Only handle messages from same window
        if (event.source !== window) {
            return;
        }

        const { data } = event;
        // Only handle messages with our specific target and types
        if (data &&
            data.target === CONFIG.TARGET_NAME &&
            data.data &&
            data.data.requestId) {

            const responseTypes = [
                CONFIG.MESSAGE_TYPES.WALLET_SIGN_RESPONSE,
                CONFIG.MESSAGE_TYPES.WALLET_ARBITRARY_RESPONSE,
                CONFIG.MESSAGE_TYPES.EXECUTE_CONTRACT,
                CONFIG.MESSAGE_TYPES.INITIATE_DEPLOY_NFT,
                CONFIG.MESSAGE_TYPES.INITIATE_TRANSFER_FT,
                CONFIG.MESSAGE_TYPES.INITIATE_CREATE_FT,
                CONFIG.MESSAGE_TYPES.INITIATE_EXECUTE_NFT
            ];
           
            if (responseTypes.includes(data.data.type)) {
                window.xell.handleResponse(data.data.requestId, data.data?.data);
            }
        }
    });
})();