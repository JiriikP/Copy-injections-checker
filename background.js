chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.tab) {
        if (message.type === "CHECKER_DISABLED") {
            // Addon je vypnutý: žlutý vykřičník
            chrome.action.setBadgeText({ text: "!", tabId: sender.tab.id });
            chrome.action.setBadgeBackgroundColor({ color: "#FFD700", tabId: sender.tab.id }); // Zlatá/Žlutá
        } 
        else if (message.type === "INJECTION_FOUND") {
            if (message.count > 0) {
                // Našly se pasti: červené číslo
                chrome.action.setBadgeText({ text: message.count.toString(), tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId: sender.tab.id }); // Červená
            } else {
                // Nic se nenašlo: zelená fajfka
                chrome.action.setBadgeText({ text: "✓", tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: "#00FF00", tabId: sender.tab.id }); // Zelená
            }
        }
    }
});