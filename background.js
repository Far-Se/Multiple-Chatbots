chrome.runtime.onMessage.addListener(async (request, _sender, sendResponse) => {
    if (request.action === "openShortcutEditor") {
        chrome.tabs.create({ url: "chrome://extensions/shortcuts#:~:text=Multiple%20Chatbots" });
        return sendResponse({ success: true });
    }
    if (request.action !== "sendQueryToAssistants")
        return sendResponse({ success: false });
    let chatBots = ["Perplexity", "Bing", "Gemini", "Claude", "ChatGPT"];
    let disabledBots = request.disabledBots;
    chatBots = chatBots.filter((bot) => !disabledBots.includes(bot));
    let tabs = [];
    const prompt = encodeURIComponent(request.query);
    for (let i = 0; i < chatBots.length; i++) {

        if (chatBots[i] == "ChatGPT") {
            const tab = await chrome.tabs.create({ url: `https://www.chatgpt.com/?q=${prompt}` });
            tabs.push(tab.id);
        }
        else if (chatBots[i] == "Claude") {
            const tab = await chrome.tabs.create({ url: `https://claude.ai/new?q=${prompt}` });
            tabs.push(tab.id);
        }
        else if (chatBots[i] == "Gemini") {
            const tab = await openGemini(request.query);
            tabs.push(tab.id);
        }
        else if (chatBots[i] == "Bing") {
            const tab = await chrome.tabs.create({ url: `https://www.bing.com/chat?q=${prompt}&sendquery=1&FORM=SCCODX` });
            tabs.push(tab.id);
        }
        else if (chatBots[i] == "Perplexity") {
            const tab = await chrome.tabs.create({ url: `https://www.perplexity.ai/search/new?q=${prompt}` });
            tabs.push(tab.id);
        }

    }
    await chrome.tabs.group({ tabIds: tabs }, async (groupId) => {
        await chrome.tabGroups.update(groupId, { collapsed: false, title: request.minTitle });
    });

    sendResponse({ success: true });
});
let openGemini = async (query) => {
    let newTab = await chrome.tabs.create({ url: "https://gemini.google.com/app" });
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
            args: [query],
        });
    });
    return newTab;

};
chrome.commands.onCommand.addListener((command) => {
    if (command === "_open_popup") {
        chrome.action.openPopup();
    }
});
