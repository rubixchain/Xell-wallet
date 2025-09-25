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
    function injectScript() {
        // Check if script is already injected
        const existingScript = document.querySelector(CONFIG.SCRIPT_SELECTOR);
        if (existingScript) {
            return;
        }

        try {
            const script = document.createElement('script');
            script.src = runtime.runtime.getURL('injection.js');
            script.onload = function () {
                this.remove();
            };
            (document.head || document.documentElement).appendChild(script);
        } catch (error) {
            console.error('Failed to inject script:', error);
        }
    }

    // ============================================================================
    // MESSAGE HANDLING
    // ============================================================================
    function handleWindowMessage(event) {
        if (!event.data || !event.data.target || event.data.target !== CONFIG.TARGET_NAME) {
            return;
        }

        if (!isExtensionValid()) {
            window.postMessage(
                createMessagePayload(event.data.type, event.data.requestId, {
                    isError: true,
                    error: 'Extension context invalidated. Please refresh the page.'
                }),
                '*'
            );
            return;
        }

        try {
            runtime.runtime.sendMessage(event.data.data, function (response) {
                // Handle response if needed
            });
        } catch (error) {
            window.postMessage(
                createMessagePayload(event.data.type, event.data.requestId, {
                    isError: true,
                    error: 'Failed to communicate with extension.'
                }),
                '*'
            );
        }
    }

    function handleRuntimeMessage(message, sender, sendResponse) {
        try {
            // Handle messages from the background script
            switch (message?.type) {
                case CONFIG.MESSAGE_TYPES.WALLET_SIGN_RESPONSE:
                case CONFIG.MESSAGE_TYPES.WALLET_ARBITRARY_RESPONSE:
                case CONFIG.MESSAGE_TYPES.EXECUTE_CONTRACT:
                case CONFIG.MESSAGE_TYPES.INITIATE_DEPLOY_NFT:
                case CONFIG.MESSAGE_TYPES.INITIATE_EXECUTE_NFT:
                case CONFIG.MESSAGE_TYPES.INITIATE_TRANSFER_FT:
                case CONFIG.MESSAGE_TYPES.INITIATE_CREATE_FT:
                    // Forward to the webpage
                    window.postMessage(
                        createMessagePayload(message.type, message.requestId, message),
                        '*'
                    );
                    break;
                case 'CONTENT_SCRIPT_CHECK':
                    // Respond to content script check
                    sendResponse({ loaded: true });
                    return true;
                default:
                    // Unknown message type - silent handling
                    break;
            }
        } catch (error) {
            console.error('Error handling runtime message:', error);
        }
    }

    // ============================================================================
    // EVENT HANDLING
    // ============================================================================
    function handleCustomEvent(event) {
        try {
            if (!isExtensionValid()) {
                return;
            }
            runtime.runtime.sendMessage(event.detail);
        } catch (error) {
            console.error('Failed to handle custom event:', error);
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    function initialize() {
        // Inject script
        injectScript();

        // Setup message listeners
        window.addEventListener('message', handleWindowMessage);
        runtime.runtime.onMessage.addListener(handleRuntimeMessage);
        window.addEventListener(CONFIG.EVENT_NAME, handleCustomEvent);

        // Notify background that content script is loaded
        try {
            runtime.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' });
        } catch (error) {
            // Silent fail - background might not be ready
        }
    }

    // ============================================================================
    // CLEANUP
    // ============================================================================
    function cleanup() {
        window.removeEventListener('message', handleWindowMessage);
        window.removeEventListener(CONFIG.EVENT_NAME, handleCustomEvent);
    }

    // ============================================================================
    // START
    // ============================================================================
    initialize();

    // Handle unload
    window.addEventListener('beforeunload', cleanup);

    // Export for testing (optional)
    window.__xellContentScript = {
        isExtensionValid,
        injectScript,
        cleanup
    };

})();