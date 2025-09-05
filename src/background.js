// Xell Wallet Background Script
import { getConfigPromise, config } from "../config";
import { handleApiCall } from "./api/contract";
import { WALLET_TYPES } from "./enums";



// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const CONFIG = {
    KEEP_ALIVE_INTERVAL: 20000, // 20 seconds
    KEEP_ALIVE_ALARM: 'keepAliveAlarm',
    STORAGE_KEYS: {
        WEBSITE_INITIATED: 'websiteInitiated'
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let pendingTabId = null;
let userDetails = null;
let isListenerRegistered = false;
let keepAliveInterval = null;


async function injectResultIntoWebpage(tabId, result) {
    if (!tabId) {
        return;
    }
    try {
        await chrome.tabs.sendMessage(tabId, result);
    } catch (error) {
        // Silent error handling
    }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================
async function handleWalletRequest(message, sender) {
    try {
        // Get website information
        const tab = await chrome.tabs.get(sender.tab.id)
        let allowedOrigins = config.ALLOWED_ORIGINS
        // Check if origin is allowed (supports wildcard matching for trie.network)
        const isOriginAllowed = (hostname, allowedOrigins) => {
            if (!allowedOrigins || allowedOrigins.length === 0) return true;

            return allowedOrigins.some(origin => {
                // Exact match
                if (origin === hostname) return true;

                // Wildcard match for trie.network domains
                if (hostname.includes('trie.network')) return true;

                // Check if hostname ends with trie.network (for subdomains)
                if (hostname.endsWith('.trie.network')) return true;

                return false;
            });
        };

        if (!isOriginAllowed(new URL(tab.url).hostname, allowedOrigins)) {
            return;
        }
        // Store website information for popup in the expected format
        await chrome.storage.local.set({
            websiteInitiated: {
                data: message.data,
                type: message.type,
                requestId: message.requestId

            },
            title: tab.title || new URL(tab.url).hostname,
            icon: tab.favIconUrl || ''
        });

        // Create the popup window using chrome.windows.create
        try {
            const popupWidth = 390; // Adjust based on your popup's design
            const popupHeight = 600;
            let leftPosition, topPosition;
            try {
                const currentWindow = await chrome.windows.getCurrent({ populate: true });
                if (currentWindow) {
                    // Position the popup in the top-right corner of the browser window
                    leftPosition = currentWindow.left + currentWindow.width - popupWidth - 10; // 10px padding from the right edge
                    topPosition = currentWindow.top + 10; // 10px padding from the top to account for browser toolbar
                } else {
                    // Fallback to screen dimensions if no current window is available
                    const displays = await new Promise((resolve) => {
                        chrome.system.display.getInfo((displayInfo) => {
                            resolve(displayInfo);
                        });
                    });
                    const primaryDisplay = displays.find(display => display.isPrimary) || displays[0];
                    const bounds = primaryDisplay.bounds;
                    leftPosition = bounds.left + bounds.width - popupWidth - 10;
                    topPosition = bounds.top + 10;
                }
            } catch (error) {
               
                // Fallback to default values
                leftPosition = 1920 - popupWidth - 10;
                topPosition = 10;
            }

            await chrome.windows.create({
                url: chrome.runtime.getURL("index.html"),
                type: "popup",
                width: popupWidth,
                height: popupHeight,
                focused: true,
                left: leftPosition,
                top: topPosition,
            });
            pendingTabId = sender.tab.id;
        } catch (error) {
            // Fallback to action popup
            await chrome.action.openPopup();
            pendingTabId = sender.tab.id;
        }
    } catch (error) {
        // Handle popup open error
        if (sender.tab?.id) {
            try {
                await chrome.tabs.sendMessage(sender.tab.id, {
                    type: "EXTENSION_ERROR",
                    error: "Failed to open extension popup: " + error.message
                });
            } catch (err) {
                // Silent error handling
            }
        }
    }
}

async function handleWalletSignResponse(message) {
    const responsePayload = {
        type: message.type,
        requestId: message.requestId,
        status: true,
        data: {
            username: message.data?.username,
            did: message.data?.did,
        }
    };
    await injectResultIntoWebpage(pendingTabId, responsePayload);
    userDetails = { ...message.data };

    // Clear storage after response is sent
    await chrome.storage.local.remove(["websiteInitiated", "title", "icon"]);
}

async function handleWalletArbitraryResponse(message) {
    const responsePayload = {
        type: message.type,
        requestId: message.requestId,
        status: true,
        data: {
            ...message.data
        }
    };
    await injectResultIntoWebpage(pendingTabId, responsePayload);
    // Clear storage after response is sent
    await chrome.storage.local.remove(["websiteInitiated", "title", "icon"]);
}

async function handleApiExecution(message, sender) {
    try {
        // Return a promise that resolves when the API call completes
        return new Promise(async (resolve, reject) => {
            try {
                const result = await handleApiCall(
                    message.type,
                    message.data,
                    pendingTabId,
                    (tabId, result) => {
                        const resultWithRequestId = {
                            type: message.type,
                            status: result.status,
                            data: result,
                            requestId: message.requestId
                        };

                        injectResultIntoWebpage(tabId, resultWithRequestId);
                    }
                )
                resolve({
                    ...result
                });
            } catch (error) {
                const errorResult = {
                    type: message.type,
                    status: false,
                    data: {
                        step: "unknown",
                        error: "Unexpected error: " + error.message,
                    },
                    requestId: message.requestId
                };
                injectResultIntoWebpage(pendingTabId, errorResult);
                resolve({
                    success: false,
                    error: error.message
                });
            }
        });
    } catch (error) {

        const errorResult = {
            type: message.type,
            status: false,
            data: {
                step: "unknown",
                error: "Unexpected error: " + error.message,
            },
            requestId: message.requestId
        };
        await injectResultIntoWebpage(pendingTabId, errorResult);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// MAIN MESSAGE LISTENER
// ============================================================================
const messageListener = async (message, sender, sendResponse) => {
    try {


        switch (message?.type) {
            case WALLET_TYPES.WALLET_SIGN_REQUEST:
            case WALLET_TYPES.WALLET_ARBITRARY_REQUEST:
            case WALLET_TYPES.INITIATE_CONTRACT:
            case WALLET_TYPES.DEPLOY_NFT:
            case WALLET_TYPES.TRANSFER_FT:
            case WALLET_TYPES.EXECUTE_NFT:
            case WALLET_TYPES.CREATE_FT:
                await handleWalletRequest(message, sender);
                break;
            case WALLET_TYPES.EXECUTE_CONTRACT:
            case WALLET_TYPES.INITIATE_DEPLOY_NFT:
            case WALLET_TYPES.INITIATE_TRANSFER_FT:
            case WALLET_TYPES.INITIATE_EXECUTE_NFT:
            case WALLET_TYPES.INITIATE_CREATE_FT:
                const initiateResult = await handleApiExecution(message, sender);
                sendResponse(initiateResult);
                return true;
            case WALLET_TYPES.WALLET_SIGN_RESPONSE:
                await handleWalletSignResponse(message);
                break;

            case WALLET_TYPES.WALLET_ARBITRARY_RESPONSE:
                await handleWalletArbitraryResponse(message);
                break;
            case WALLET_TYPES.STORE_USER_DETAILS:
                userDetails = { ...message.data };
                break;

            case WALLET_TYPES.GET_USER_DETAILS:
                sendResponse({
                    status: userDetails ? true : false,
                    userDetails: userDetails
                });
                return true;

            case WALLET_TYPES.CLEAR_USER_DETAILS:
                userDetails = null;
                sendResponse({ success: true });
                return true;
            case 'CONTENT_SCRIPT_LOADED':
                break;
            default:
                // Unknown message type - silent handling
                break;
        }
    } catch (error) {
        sendResponse({ status: false, success: false, error: error.message });
        return true;
    }
};

// ============================================================================
// KEEP ALIVE MANAGEMENT
// ============================================================================
function setupKeepAlive() {
    try {
        // Clear existing intervals
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
        }

        // More robust keep alive interval
        keepAliveInterval = setInterval(() => {
            // Keep service worker alive by doing some work
            chrome.storage.local.get(['keepAlive'], (result) => {
                chrome.storage.local.set({ 'keepAlive': Date.now() });
            });
        }, CONFIG.KEEP_ALIVE_INTERVAL);

        // Set up alarm for additional keep-alive
        chrome.alarms.create(CONFIG.KEEP_ALIVE_ALARM, {
            delayInMinutes: 1,
            periodInMinutes: 1
        });
    } catch (error) {
        // Silent error handling
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function setupMessageListener() {
    // Remove existing listener to prevent duplication
    if (isListenerRegistered) {
        chrome.runtime.onMessage.removeListener(messageListener);
        isListenerRegistered = false;
    }

    // Register the listener
    if (!isListenerRegistered) {
        chrome.runtime.onMessage.addListener(messageListener);
        isListenerRegistered = true;
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
chrome.runtime.onInstalled.addListener((details) => {
    setupMessageListener();
    setupKeepAlive();
});

chrome.runtime.onStartup.addListener(() => {
    setupMessageListener();
    setupKeepAlive();
});

chrome.runtime.onSuspend.addListener(() => {
    // Clean up
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
});

// Alarm handler for keep-alive
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CONFIG.KEEP_ALIVE_ALARM) {
        // Keep service worker alive
        chrome.storage.local.set({ 'keepAlive': Date.now() });
    }
});

// ============================================================================
// STARTUP
// ============================================================================
try {
    getConfigPromise().then(() => {
       
    }).catch((error) => {
      
    });

    setupMessageListener();
    setupKeepAlive();
} catch (error) {
    // Silent error handling
}
