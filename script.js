/* eslint-disable no-undef */

let disabledBots = [];
let predefinedPrompts = [];
let editingID = -1;
let submitByCtrlEnter = false;
const storage = async () => await chrome.storage.local.get(["disabledChatbots", "predefinedPrompts", "ctrlEnter", "css", "defaultPrompt"]);
const chatBots = ["ChatGPT", "Claude", "Gemini", "Bing", "Perplexity"];
let allData = {};
let defaultPrompt = -1;
const storageSet = async (data) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage"))
        await chrome.storage.local.set(data);
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
    window.addEventListener("resize", updateChatButtonsWidth);


    document.querySelector("#changeCSS").addEventListener("click", (event) => toggleModal(event));

    document.querySelector("#shortcutEditor").addEventListener("click", () => chrome.runtime.sendMessage({ action: "openShortcutEditor" }));

    document.querySelectorAll(".closeEvent").forEach((button) => button.addEventListener("click", (event) => toggleModal(event)));

    document.querySelector("#ctrlEnter").addEventListener("change", () => storageSet({ "ctrlEnter": JSON.stringify(submitByCtrlEnter = document.querySelector("#ctrlEnter").checked) }));

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

                if (disabledBots.includes(button.value)) {
                    disabledBots.splice(disabledBots.indexOf(button.value), 1);
                    button.classList.remove("disabled");
                } else {
                    disabledBots.push(button.value);
                    button.classList.add("disabled");
                }
                document.querySelector("#geminiInfo").style.display = document.querySelector(".chat_button[value='Gemini']:not(.disabled)") ? "block" : "none";
                storageSet({ "disabledChatbots": JSON.stringify(disabledBots) });
            });
        };
    }

    async function initSettings() {
        await loadSettings();
        customCSS();
        initChatBots();
        addPredefinedButtons();
        updateChatButtonsWidth();

        function customCSS() {
            const css = storageGet("css") ?? "";
            if (css) document.querySelector("body").insertAdjacentHTML("beforeend", `<style id="customCSS">${css}</style>`);
            document.querySelector("[name='customCSS']").value = css;
        }

        function initChatBots() {
            disabledBots = JSON.parse(storageGet("disabledChatbots")) ?? [];
            for (let i = 0; i < chatBots.length; i++) {
                if (disabledBots.includes(chatBots[i])) continue;
                document.querySelector(`.chat_button[value="${chatBots[i]}"]`).classList.remove("disabled");
            }
            document.querySelector("#geminiInfo").style.display = document.querySelector(".chat_button[value='Gemini']:not(.disabled)") ? "block" : "none";
            if (submitByCtrlEnter) document.querySelector("#ctrlEnter").checked = true;
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
            defaultPrompt = storageGet("defaultPrompt") ?? -1;
            predefinedPrompts = JSON.parse(storageGet("predefinedPrompts")) ?? [...setOfPredefinedPrompts];
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
        if (!document.querySelector("#query").value.length) return;

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
            const num = predefinedPrompts.length - parseInt(event.key);
            console.log(num);
            if (num >= 0 && num < predefinedPrompts.length) {
                const text = predefinedPrompts[num].prompt + "\n" + document.querySelector("#query").value;
                openChatBots(text);
            }
            event.preventDefault();
        }
    });
});

const updateChatButtonsWidth = () => {
    document.querySelector("#chatButtons").style.width = document.querySelector("#mainBox").getBoundingClientRect().width.toString() + "px";
};

const addPredefinedButtons = () => {

    [...document.querySelectorAll(".askButtons .buttons button:not(#addNew)")].map((button) => button.remove());

    for (let i = 0; i < predefinedPrompts.length; i++)
        document.querySelector(".askButtons .buttons").insertAdjacentHTML("beforeend", `<button class="outline prefPromptButton" data-id="${i}" data-shortcut="${predefinedPrompts.length - i}" >${predefinedPrompts[i].title}</button>`);
    if (defaultPrompt !== -1) document.querySelector(`.prefPromptButton[data-id="${defaultPrompt}"]`).classList.add("selected");
    updateChatButtonsWidth();
};

const openChatBots = (query) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        chrome.runtime.sendMessage({
            action: "sendQueryToAssistants",
            query: query,
            disabledBots: disabledBots,
            minTitle: document.querySelector("#query").value.substring(0, 50),
        });
        return;
    }
    const prompt = encodeURIComponent(query);
    const botLinks = {
        "Perplexity": `https://www.perplexity.ai/search/new?q=${prompt}`,
        "Bing": `https://www.bing.com/chat?q=${prompt}&sendquery=1&FORM=SCCODX`,
        "Gemini": `https://gemini.google.com/app?q=${prompt}`,
        "Claude": `https://claude.ai/new?q=${prompt}`,
        "ChatGPT": `https://www.chatgpt.com/?q=${prompt}`
    };
    const chatBotsReversed = chatBots.slice().reverse();
    for (const bot of chatBotsReversed) {
        if (disabledBots.includes(bot) || botLinks[bot] === undefined) continue;
        window.open(botLinks[bot], "_blank");
    }

};

document.querySelector("#savePrompt").addEventListener("click", (event) => {
    toggleModal(event);
    const title = document.querySelector("input[name='promptName']").value;
    const prompt = document.querySelector("textarea[name='prompt']").value;
    if (editingID !== -1) predefinedPrompts[editingID] = { title, prompt };
    else
        predefinedPrompts.push({ title, prompt });
    editingID = -1;
    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
    addPredefinedButtons();

    document.querySelector("[name='promptName']").value = "";
    document.querySelector("[name='prompt']").value = "";
});
document.querySelector("#saveCSS").addEventListener("click", (event) => {
    toggleModal(event);
    const css = document.querySelector("textarea[name='customCSS']").value;
    document.querySelector("#customCSS")?.remove();
    document.querySelector("body").insertAdjacentHTML("beforeend", `<style id="customCSS">${css}</style>`);
    storageSet({ "css": css });
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
