// Xell Wallet Content Script
(function () {
    'use strict';

    // ============================================================================
    // CONSTANTS & CONFIGURATION
    // ============================================================================
    const CONFIG = {
        TARGET_NAME: 'xell-extension',
        MESSAGE_TYPES: {
            WALLET_SIGN_RESPONSE: 'WALLET_SIGN_RESPONSE',
            WALLET_ARBITRARY_RESPONSE: 'WALLET_ARBITRARY_RESPONSE',
            EXECUTE_CONTRACT: 'EXECUTE_CONTRACT',
            INITIATE_DEPLOY_NFT: 'INITIATE_DEPLOY_NFT',
            INITIATE_EXECUTE_NFT: 'INITIATE_EXECUTE_NFT',
            INITIATE_TRANSFER_FT: 'INITIATE_TRANSFER_FT',
            INITIATE_CREATE_FT: 'INITIATE_CREATE_FT'
        },
        SCRIPT_SELECTOR: 'script[src*="injection.js"]',
        EVENT_NAME: 'xellTrigger'
    };

    // ============================================================================
    // BROWSER DETECTION & RUNTIME
    // ============================================================================
    const isFirefox = typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined';
    const runtime = isFirefox ? browser : chrome;

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    function isExtensionValid() {
        try {
            runtime.runtime.getURL('');
            return true;
        } catch (e) {
            return false;
        }
    }

    function createMessagePayload(type, requestId, data = {}) {
        return {
            target: CONFIG.TARGET_NAME,
            data: { type, requestId, data }
        };
    }

    // ============================================================================
    // SCRIPT INJECTION
    // ============================================================================
    function injectWalletScript() {
        try {
            if (!isExtensionValid()) {
                return;
            }

            // Check if script is already injected
            if (!document.querySelector(CONFIG.SCRIPT_SELECTOR)) {
                const script = document.createElement('script');
                script.src = runtime.runtime.getURL('injection.js');
                script.onload = function () {
                    window.dispatchEvent(new CustomEvent('extensionReady'));
                };
                (document.head || document.documentElement).appendChild(script);
            }
        } catch (err) {
            // Silent error handling
        }
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    function handleWalletTrigger(event) {
        try {
            if (!isExtensionValid()) {
                return;
            }

            const data = event.detail;
            runtime.runtime.sendMessage({ ...data })
                .then(response => {
                })
                .catch(err => {
                    handleBackgroundScriptError(err, data);
                });
        } catch (err) {
           
            // Silent error handling
        }
    }

    function handleBackgroundScriptError(err, originalData) {
        // Handle background script unavailability
        if (err.message.includes('No SW') || err.message.includes('Could not establish connection')) {
            try {
                chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    func: (requestId, errorMsg) => {
                        if (window.xell && window.xell.resolvePromise) {
                            window.xell.resolvePromise(requestId, { error: errorMsg });
                        }
                    },
                    args: [originalData.requestId, 'Background script not available']
                });
            } catch (e) {
                // Silent error handling
            }
        } else {
            window.postMessage({
                type: 'EXTENSION_ERROR',
                error: err.message,
                requestId: originalData.requestId
            }, '*');
        }
    }

    function handleBackgroundMessage(message, sender, sendResponse) {
        try {
            // Handle all response messages from background script
            const responseTypes = [
                CONFIG.MESSAGE_TYPES.WALLET_SIGN_RESPONSE,
                CONFIG.MESSAGE_TYPES.WALLET_ARBITRARY_RESPONSE,
                CONFIG.MESSAGE_TYPES.EXECUTE_CONTRACT,
                CONFIG.MESSAGE_TYPES.INITIATE_DEPLOY_NFT,
                CONFIG.MESSAGE_TYPES.INITIATE_TRANSFER_FT,
                CONFIG.MESSAGE_TYPES.INITIATE_CREATE_FT,
                CONFIG.MESSAGE_TYPES.INITIATE_EXECUTE_NFT,
            ];

            if (responseTypes.includes(message.type)) {
                
                let payload = {
                    status: message.status,
                    data: message.data
                }
               
                window.postMessage(createMessagePayload(message.type, message.requestId, payload), "*");
            }
            return false; // No async response needed
        } catch (err) {
            // Silent error handling
        }
    }

    // ============================================================================
    // EVENT LISTENER SETUP
    // ============================================================================
    function setupEventListeners() {
        try {
            // Remove existing listener to prevent duplicates
            window.removeEventListener(CONFIG.EVENT_NAME, handleWalletTrigger);
            // Add the listener
            window.addEventListener(CONFIG.EVENT_NAME, handleWalletTrigger);
        } catch (err) {
            // Silent error handling
        }
    }

    function setupMessageListener() {
        try {
            if (isExtensionValid()) {
                runtime.runtime.onMessage.addListener(handleBackgroundMessage);
            }
        } catch (err) {
            // Silent error handling
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    function initialize() {
        injectWalletScript();
        setupEventListeners();
        setupMessageListener();

        // Notify background script that content script is loaded
        try {
            if (isExtensionValid()) {
                runtime.runtime.sendMessage({
                    type: 'CONTENT_SCRIPT_LOADED',
                    url: window.location.href
                });
            }
        } catch (err) {
            // Silent error handling
        }
    }

    // Start initialization
    initialize();
})();