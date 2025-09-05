import { handleApiCall } from "./api/contract";
import { WALLET_TYPES } from "./enums";

let pendingTabId = null



function injectResultIntoWebpage(tabId, result) {
    browser.tabs.sendMessage(pendingTabId, {
        ...result
    }, (response) => {
        if (browser.runtime.lastError) {

            pendingTabId = null; // Clear after sending
        } else {

        }
    });
}

browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if ([WALLET_TYPES.WALLET_SIGN_REQUEST,
        WALLET_TYPES.WALLET_ARBITRARY_REQUEST,
        WALLET_TYPES.DEPLOY_NFT,
        WALLET_TYPES.INITIATE_CONTRACT,
        WALLET_TYPES.TRANSFER_FT,
        WALLET_TYPES.EXECUTE_NFT
        ].includes(message?.type)) {
            browser.windows.create({
                url: browser.runtime.getURL("index.html"),
                type: "popup",
                width: 375,
                height: 600,
                top: 10,
                left: window.screen.width - 100
            })
            pendingTabId = sender.tab.id; // Store the
            browser?.storage.local.set({ websiteInitiated: message }, () => {

            });
        }
        else if (message?.type === WALLET_TYPES.WALLET_SIGN_RESPONSE) {
            injectResultIntoWebpage(pendingTabId, message)
        }
        else if ([
            WALLET_TYPES.EXECUTE_CONTRACT,
            WALLET_TYPES.INITIATE_DEPLOY_NFT, WALLET_TYPES.INITIATE_TRANSFER_FT, WALLET_TYPES.INITIATE_EXECUTE_NFT].includes(message?.type)) {
            handleApiCall(message?.type, message?.data, pendingTabId, injectResultIntoWebpage).then((finalResult) => {
                // Final acknowledgment to the original message
                sendResponse({ success: true });
            }).catch((error) => {

                // Inject the error result into the webpage
                const errorResult = { status: false, step: "unknown", error: "Unexpected error: " + error.message };
                injectResultIntoWebpage(pendingTabId, errorResult);
                sendResponse({ success: false, error: error.message });
            });

            return true; // Keep the message channel open for async response
        }
    })
