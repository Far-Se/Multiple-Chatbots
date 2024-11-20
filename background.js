 

chrome.runtime.onMessage.addListener(async (request, _sender, sendResponse) => {

    if (request.action === "openShortcutEditor") {
        chrome.tabs.create({ url: "chrome://extensions/shortcuts#:~:text=Multiple%20Chatbots" });
        return sendResponse({ success: true });
    }

    if (request.action !== "sendQueryToAssistants") return sendResponse({ success: false });

    const chatBots = request.links;

    const tabs = [];
    
    for (const i of Object.keys(chatBots)) {
        if (i === "Gemini") 
            tabs.push((await openGemini(request.query)).id);
         else 
            tabs.push((await chrome.tabs.create({ url: chatBots[i] })).id);
    }
    if(tabs.length === 1) return sendResponse({ success: true });
    await chrome.tabs.group({ tabIds: tabs }, async (groupId) => {
        await chrome.tabGroups.update(groupId, { collapsed: false, title: request.prompt.substring(0,50) });
    });

    sendResponse({ success: true });
});

const openGemini = async (query) => {
    const newTab = await chrome.tabs.create({ url: "https://gemini.google.com/app" });
    let executed = false;
    const listener = chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (executed || tabId !== newTab.id || changeInfo.status !== "complete") return false;
        chrome.tabs.onUpdated.removeListener(listener); 
        executed = true;
        chrome.scripting.executeScript({
            target: { tabId },
            func: (query) => {
                setTimeout(() => {
                    document.querySelector("rich-textarea p").textContent = `${query}`;
                    setTimeout(() => document.querySelector(".send-button").click(), 400);
                }, 1400);
            },
            args: [query]
        });
    });
    return newTab;

};

chrome.commands.onCommand.addListener((command) => command === "_open_popup" && chrome.action.openPopup() );
