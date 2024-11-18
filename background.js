
chrome.runtime.onMessage.addListener(async (request, _sender, sendResponse) => {

    if (request.action === "openShortcutEditor") {
        chrome.tabs.create({ url: "chrome://extensions/shortcuts#:~:text=Multiple%20Chatbots" });
        return sendResponse({ success: true });
    }

    if (request.action !== "sendQueryToAssistants") return sendResponse({ success: false });

    let chatBots = ["Perplexity", "Bing", "Gemini", "Claude", "ChatGPT"];

    const disabledBots = request.disabledBots;
    chatBots = chatBots.filter((bot) => !disabledBots.includes(bot));

    const tabs = [];
    const prompt = encodeURIComponent(request.query);
    const links = {
        "ChatGPT": `https://www.chatgpt.com/?q=${prompt}`,
        "Claude": `https://claude.ai/new?q=${prompt}`,
        "Bing": `https://www.bing.com/chat?q=${prompt}&sendquery=1&FORM=SCCODX`,
        "Perplexity": `https://www.perplexity.ai/search/new?q=${prompt}`
    };
    for (let i = 0; i < chatBots.length; i++) {

        if (chatBots[i] === "Gemini") {
            tabs.push((await openGemini(request.query)).id);
        } else {
            if (links[chatBots[i]] === undefined) continue;
            tabs.push((await chrome.tabs.create({ url: links[chatBots[i]] })).id);
        }

    }
    await chrome.tabs.group({ tabIds: tabs }, async (groupId) => {
        await chrome.tabGroups.update(groupId, { collapsed: false, title: request.minTitle });
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
