/* eslint-disable no-undef */

const disabledBots = [];
let predefinedPrompts = [];
let editingID = -1;
let submitByCtrlEnter = false;
const storage = async () => await chrome.storage.local.get(["predefinedPrompts", "ctrlEnter", "css", "defaultPrompt", "botList", "compactTheme"]);

let allData = {};
let defaultPrompt = -1;
const storageSet = async (data) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        allData[Object.keys(data)[0]] = Object.values(data)[0];
        await chrome.storage.local.set(data);
    }
    else
        localStorage.setItem(Object.keys(data)[0], Object.values(data)[0]);
};
const storageGet = (key) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        if (Object.prototype.hasOwnProperty.call(allData, key))
            return allData[key];
        return null;
    }
    else
        return localStorage.getItem(key);
};
const getBots = (prompt) => {
    if (prompt === undefined) prompt = "{prompt}";
    const botList = storageGet("botList");
    if (botList) {
        try {
            const bots = JSON.parse(botList);
            for (const bot of Object.keys(bots))
                bots[bot].link = bots[bot].link.replace("{prompt}", prompt);

            return bots;
        } catch (error) {
            console.error("Error while loading botList from storage:", error);
        }
    }
    return {
        "ChatGPT": { "state": "enabled", "link": `https://www.chatgpt.com/?q=${prompt}` },
        "Claude": { "state": "enabled", "link": `https://claude.ai/new?q=${prompt}` },
        "Gemini": { "state": "enabled", "link": `https://gemini.google.com/app?q=${prompt}` },
        "Mistral": { "state": "enabled", "link": `https://chat.mistral.ai/chat?q=${prompt}` },
        "Perplexity": { "state": "enabled", "link": `https://www.perplexity.ai/search/new?q=${prompt}` },
        "Bing": { "state": "enabled", "link": `https://www.bing.com/chat?q=${prompt}&sendquery=1&FORM=SCCODX` },
    };
};
const chatBots = Object.keys(getBots(""));
const setOfPredefinedPrompts = [
    {
        title: "Code Only",
        prompt: "You must provide only the code, without any addition information."
    },
    {
        title: "Lists",
        prompt: "You must provide a list of different possible response to the question."
    },
    {
        title: "Short",
        prompt: "Provide clear and concise answers to my questions with minimum unnecessary information."
    },
];
document.addEventListener("DOMContentLoaded", async () => {

    let mouseDownTime = 0;
    await initSettings();

    document.querySelectorAll(".chat_button").forEach(chatBotsButtons());

    document.querySelector("#query").addEventListener("keydown", submitPrompt());
    document.querySelector(".mainAsk").addEventListener("click", submitSimplePrompt());


    document.addEventListener("contextmenu", predefinedPromptsMiddleButton());
    document.addEventListener("mouseup", predefinedPromptsButtonMouseUp());
    document.addEventListener("mousedown", predefinedPromptsButtonMoouseDown());


    document.querySelector("#openSettings").addEventListener("click", (event) => toggleModal(event));

    document.querySelector("#shortcutEditor").addEventListener("click", () => chrome.runtime.sendMessage({ action: "openShortcutEditor" }));

    document.querySelectorAll(".closeEvent").forEach((button) => button.addEventListener("click", (event) => toggleModal(event)));

    document.querySelector("#ctrlEnter").addEventListener("change", () =>
        storageSet({ "ctrlEnter": JSON.stringify(submitByCtrlEnter = document.querySelector("#ctrlEnter").checked) }));

    document.querySelector("#compactTheme").addEventListener("change", (e) =>
        storageSet({ "compactTheme": JSON.stringify(e.target.checked) }));

    document.querySelector("#addNew").addEventListener("click", (event) => {
        editingID = -1;
        document.querySelectorAll("[name='promptName'],[name='prompt']").forEach(e => e.value = "");
        toggleModal(event);
    });


    function submitSimplePrompt() {
        return () => {
            if (!document.querySelector("#query").value.length) return;
            openChatBots(document.querySelector("#query").value);
        };
    }

    function submitPrompt() {
        return (event) => {
            if (!document.querySelector("#query").value.length) return;
            if (event.key === "Enter") {
                if (!event.ctrlKey && submitByCtrlEnter) return;
                event.preventDefault();

                let text = document.querySelector("#query").value;
                if (defaultPrompt !== -1)
                    text = `${predefinedPrompts[defaultPrompt].prompt}\n${text}`;

                openChatBots(text);
            }
        };
    }

    function chatBotsButtons() {
        return (button) => {
            button.addEventListener("click", () => {
                if (!chatBots.includes(button.value)) return;
                const bots = getBots("{prompt}");
                if (bots[button.value].state === "disabled") {
                    bots[button.value].state = "enabled";
                    button.classList.remove("disabled");
                } else {
                    bots[button.value].state = "disabled";
                    button.classList.add("disabled");
                }
                document.querySelector("#geminiInfo").style.display = document.querySelector(".chat_button[value='Gemini']:not(.disabled)") ? "block" : "none";
                storageSet({ "botList": JSON.stringify(bots) });
            });
        };
    }

    async function initSettings() {
        await loadSettings();
        initChatBots();
        addPredefinedButtons();

        function initChatBots() {
            const bots = getBots("{prompt}");
            disabledBots.push(...Object.keys(bots).filter((bot) => bots[bot].state !== "enabled"));
            for (let i = 0; i < chatBots.length; i++) {
                if (bots[chatBots[i]].state === "hidden") continue;
                document.querySelector("#chatButtons div").insertAdjacentHTML("beforeend", `<button class="chat_button outline ${disabledBots.includes(chatBots[i]) ? "disabled" : ""}" value="${chatBots[i]}">${chatBots[i]}</button>`);
            }
            document.querySelector("#geminiInfo").style.display = document.querySelector(".chat_button[value='Gemini']:not(.disabled)") ? "block" : "none";
            if (submitByCtrlEnter) document.querySelector("#ctrlEnter").checked = true;
            if (storageGet("compactTheme") === "true") {
                document.querySelector("#compactTheme").checked = true;
                document.querySelector("body").classList.add("compactTheme");
            }
        }

        async function loadSettings() {


            if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {

                document.querySelector("html").classList.add("app");
                document.querySelectorAll(".websiteVisible").forEach((element) => element.style.display = "none");
                allData = await storage();

                const keys = await chrome.commands.getAll();
                if (keys.length) {
                    if (keys[0].shortcut.length < 2) keys[0].shortcut = "Edit Shortcut";
                    document.querySelector("#shortcutEditor").innerText = `${keys[0].shortcut}`;
                }

            } else {
                document.querySelector("html").classList.add("web");
                document.querySelectorAll(".extVisisble").forEach((element) => element.style.display = "none");
            }

            const css = storageGet("css") ?? "";
            if (css) document.querySelector("body").insertAdjacentHTML("beforeend", `<style id="customCSS">${css}</style>`);
            document.querySelector("[name='customCSS']").value = css;
            document.querySelector("[name='botList']").value = JSON.stringify(getBots("{prompt}"), null, 4);

            predefinedPrompts = JSON.parse(storageGet("predefinedPrompts")) ?? [...setOfPredefinedPrompts];
            defaultPrompt = parseInt(storageGet("defaultPrompt") ?? -1);
            if (defaultPrompt > predefinedPrompts.length - 1) defaultPrompt = -1;
            submitByCtrlEnter = JSON.parse(storageGet("ctrlEnter")) ?? false;


        }
    }

    function predefinedPromptsMiddleButton() {
        return (event) => {
            if (event.target.classList.contains("prefPromptButton")) {
                event.preventDefault();

                editingID = parseInt(event.target.dataset.id);
                if (editingID === undefined) return alert("Error, no ID found");

                document.querySelector("[name='promptName']").value = predefinedPrompts[editingID].title;
                document.querySelector("[name='prompt']").value = predefinedPrompts[editingID].prompt;

                openModal(document.getElementById("edit-modal"));
            } else if (event.target.classList.contains("chatButton")) {
                openModal(document.getElementById("settings"));
                event.preventDefault();
            }
        };
    }

    function predefinedPromptsButtonMoouseDown() {
        return (event) => {
            if (event.target.classList.contains("prefPromptButton")) {
                if (event.button === 0)
                    mouseDownTime = new Date().getTime();

                if (event.button === 1) {

                    editingID = parseInt(event.target.dataset.id);
                    if (editingID === undefined) alert("Error, no ID found");

                    predefinedPrompts = moveElementUp(predefinedPrompts, editingID);

                    addPredefinedButtons();

                    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
                }
            }
        };
    }

    function predefinedPromptsButtonMouseUp() {
        return (event) => {
            if (event.button === 0 && event.target.classList.contains("prefPromptButton")) {
                if (mouseDownTime + 300 < new Date().getTime()) {

                    const id = parseInt(event.target.dataset.id);
                    if (id === defaultPrompt) defaultPrompt = -1;
                    else defaultPrompt = id;
                    console.log(defaultPrompt);
                    storageSet({ "defaultPrompt": defaultPrompt });
                    addPredefinedButtons();
                    return;
                }
                if (!document.querySelector("#query").value.length) return;
                const promptID = parseInt(event.target.dataset.id);
                const text = predefinedPrompts[promptID].prompt + "\n" + document.querySelector("#query").value;
                openChatBots(text);
            }
        };
    }
    document.addEventListener("keydown", (event) => {
        if (event.key === "Alt") {
            document.querySelector(".askButtons").classList.add("shortcutEnabled");
            event.preventDefault();
        }
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === "Alt") {
            document.querySelector(".askButtons").classList.remove("shortcutEnabled");
            event.preventDefault();
        }

        if (event.altKey && parseInt(event.key) >= 1 && parseInt(event.key) <= 9) {
            if (!document.querySelector("#query").value.length) return;
            event.preventDefault();

            const num = predefinedPrompts.length - parseInt(event.key);

            if (num >= 0 && num < predefinedPrompts.length) {
                const text = predefinedPrompts[num].prompt + "\n" + document.querySelector("#query").value;
                openChatBots(text);
            }

        }
    });
});


const addPredefinedButtons = () => {

    [...document.querySelectorAll(".askButtons .buttons button:not(#addNew)")].map((button) => button.remove());

    for (let i = 0; i < predefinedPrompts.length; i++)
        document.querySelector(".askButtons .buttons").insertAdjacentHTML("beforeend", `<button class="outline prefPromptButton" data-id="${i}" data-shortcut="${predefinedPrompts.length - i}" >${predefinedPrompts[i].title}</button>`);
    if (defaultPrompt !== -1) document.querySelector(`.prefPromptButton[data-id="${defaultPrompt}"]`).classList.add("selected");
};

const openChatBots = (query) => {
    const prompt = encodeURIComponent(query);
    const botLinks = getBots(prompt);
    // const bots = Object.fromEntries(
        // Object.entries(botLinks).filter(([key]) => !disabledBots.includes(key)).slice().reverse()
    // );
    const bots = {};
    const botKeys = Object.keys(botLinks);
    botKeys.reverse();
    for(const bot of botKeys){
        if(botLinks[bot].state !== "enabled")continue;
        bots[bot] = botLinks[bot].link;
    }
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        //remove from botlinks disabledBots
        // console.log(bots);
        chrome.runtime.sendMessage({
            action: "sendQueryToAssistants",
            query: query,
            prompt: document.querySelector("#query").value,
            links: bots,

            minTitle: document.querySelector("#query").value.substring(0, 50),
        });
        return;
    }
    for (const bot of Object.values(bots))
        window.open(bot, "_blank");


};

document.querySelector("#saveSettings").addEventListener("click", (event) => {
    const botList = document.querySelector("textarea[name='botList']").value;
    try {
        JSON.parse(botList);
    } catch (e) {
        alert(e);
        return;
    }
    storageSet({ "botList": botList });
    toggleModal(event);
    console.log("settings saved");
    const css = document.querySelector("textarea[name='customCSS']").value;
    document.querySelector("#customCSS")?.remove();
    document.querySelector("body").insertAdjacentHTML("beforeend", `<style id="customCSS">${css}</style>`);
    storageSet({ "css": css });
    window.location.reload();
});

document.querySelector("#savePrompt").addEventListener("click", (event) => {
    toggleModal(event);
    const title = document.querySelector("input[name='promptName']").value;
    const prompt = document.querySelector("textarea[name='prompt']").value;
    if (editingID !== -1) predefinedPrompts[editingID] = { title, prompt };
    else
        predefinedPrompts = [{ title, prompt }, ...predefinedPrompts];
    editingID = -1;
    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
    addPredefinedButtons();

    document.querySelector("[name='promptName']").value = "";
    document.querySelector("[name='prompt']").value = "";
});

document.querySelector("#deletePrompt").addEventListener("click", (event) => {
    toggleModal(event);

    if (editingID === -1) return;
    predefinedPrompts.splice(editingID, 1);

    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });

    document.querySelector("[name='promptName']").value = "";
    document.querySelector("[name='prompt']").value = "";

    addPredefinedButtons();
});

function moveElementUp(array, index) {
    if (index < 0 || index >= array.length)
        throw new Error("Index out of bounds");

    const newIndex = (index + 1) % array.length;
    const element = array[index];
    array.splice(index, 1);
    array.splice(newIndex, 0, element);

    return array;
}
