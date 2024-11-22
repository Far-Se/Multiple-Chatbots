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
const getBots = (prompt, getDefault) => {
    if (prompt === undefined) prompt = "{prompt}";
    const botList = storageGet("botList");
    if (botList && getDefault === undefined) {
        try {
            const bots = JSON.parse(botList);
            for (const bot of Object.keys(bots))
                bots[bot].link = bots[bot].link.replace("{prompt}", prompt);

            return { ...bots };
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
let  chatBots = [];
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

function changeKey(obj, oldKey, newKey) {
    const newObj = {};
  
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key === oldKey) 
          newObj[newKey] = obj[key];
         else 
          newObj[key] = obj[key];
        
      }
    }
  
    return newObj;
  }
  
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
            chatBots = Object.keys(bots);
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
            initBotListSettings();
            

            predefinedPrompts = JSON.parse(storageGet("predefinedPrompts")) ?? [...setOfPredefinedPrompts];
            defaultPrompt = parseInt(storageGet("defaultPrompt") ?? -1);
            if (defaultPrompt > predefinedPrompts.length - 1) defaultPrompt = -1;
            submitByCtrlEnter = JSON.parse(storageGet("ctrlEnter")) ?? false;


        }
    }
    function initBotListSettings() {
        const bots = getBots("{prompt}");
        if (!Object.keys(bots).length)return;
        chatBots = Object.keys(bots);
        const botEl = document.querySelector("#botList");
        botEl.innerHTML = "";
        for(const bot of Object.keys(bots))
            botEl.innerHTML += getBotTemplate(bot, bots[bot]);        
        document.querySelectorAll(".botTemplate").forEach(button => button.addEventListener("click", botAction));
        document.querySelectorAll(".botSetting [name=\"title\"]").forEach(button => button.addEventListener("blur", botAction));
        document.querySelectorAll(".botSetting [name=\"botState\"]").forEach(button => button.addEventListener("change", botAction));
    }
    function getBotTemplate(bot,data) 
    {
        return `
            <p>Bot:</p>
            <div class="botSetting" data-id="${bot}">
            <div class="part1 grid">
                    <input type="text" data-action="save" name="title" placeholder="title" aria-label="title" value="${bot}">   
                    <select name="botState" data-action="save" aria-label="Select" required>
                        <option  id="enabled" value="enabled" name="botState" ${data.state === "enabled" ? "selected" : ""} >Enabled</option>
                        <option  id="disabled" value="disabled" name="botState" ${data.state === "disabled" ? "selected" : ""} >Disabled</option>
                        <option  id="hidden" value="hidden" name="botState" ${data.state === "hidden" ? "selected" : ""} >Hidden</option>
                    </select>
                    <div class="sort">
                        <button class="outline secondary botTemplate" data-action="moveUp" data-tooltip="Move Up">
                        <svg enable-background="new 0 0 32 32" height="16px" id="Layer_1" version="1.1" viewBox="0 0 32 32" width="16px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M18.221,7.206l9.585,9.585c0.879,0.879,0.879,2.317,0,3.195l-0.8,0.801c-0.877,0.878-2.316,0.878-3.194,0  l-7.315-7.315l-7.315,7.315c-0.878,0.878-2.317,0.878-3.194,0l-0.8-0.801c-0.879-0.878-0.879-2.316,0-3.195l9.587-9.585  c0.471-0.472,1.103-0.682,1.723-0.647C17.115,6.524,17.748,6.734,18.221,7.206z" fill="#515151"/></svg>
                        </button>
                        <button class="outline botTemplate" data-action="moveDown"  data-tooltip="Move Down">
                        <svg enable-background="new 0 0 32 32" height="16px" id="Layer_1" version="1.1" viewBox="0 0 32 32" width="16px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M14.77,23.795L5.185,14.21c-0.879-0.879-0.879-2.317,0-3.195l0.8-0.801c0.877-0.878,2.316-0.878,3.194,0  l7.315,7.315l7.316-7.315c0.878-0.878,2.317-0.878,3.194,0l0.8,0.801c0.879,0.878,0.879,2.316,0,3.195l-9.587,9.585  c-0.471,0.472-1.104,0.682-1.723,0.647C15.875,24.477,15.243,24.267,14.77,23.795z" fill="#515151"/></svg></button>
                    </div>
                </div>
                                 
                <div class="part2 grid">
                    <input type="text" name="url" placeholder="url" aria-label="url" value="${data.link}">
                    <div role="group">
                        <button class="outline secondary botTemplate" data-action="delete" data-tooltip="Delete">🗑️</button>
                        </div>
                    </div>
            </div>
            `;
    }
    document.querySelector("#resetBots").addEventListener("click", async () => {
        await storageSet({ "botList": JSON.stringify(getBots("{prompt}", true)) });
        window.location.reload();
    });
    document.querySelector("#addNewBot").addEventListener("click", async () => {
        bots = getBots("{prompt}");
        bots["New Bot"] = { "state": "enabled", "link": "https://www.website.com/?q={prompt}" };
        await storageSet({ "botList": JSON.stringify(bots) });
        initBotListSettings();
    });
    function botAction(e) 
    {
        e.preventDefault();
        const event = e.target;
        let bot = event.closest(".botSetting").dataset.id;
        let bots = { ...getBots("{prompt}") };
        const botNames = Object.keys(bots);
        const botIndex = botNames.indexOf(bot);
        console.log(e, event.dataset.action, bot, botIndex);
        if(event.dataset.action === "moveUp" || event.dataset.action === "moveDown")
        {
            if(botIndex > -1)
            {
                if(event.dataset.action === "moveUp" && botIndex > 0)
                {
                    botNames.splice(botIndex, 1);
                    botNames.splice(botIndex-1, 0, bot);
                }
                else if(event.dataset.action === "moveDown" && botIndex < botNames.length-2)
                {
                    botNames.splice(botIndex, 1);
                    botNames.splice(botIndex+1, 0, bot);
                }
                const newBots = {};
                for(const bot of botNames)
                    newBots[bot] = bots[bot];
                bots = { ...newBots };
                storageSet({ "botList": JSON.stringify(newBots) });

            }
        }
        if(event.dataset.action === "delete")
        {
            delete bots[bot];
            storageSet({ "botList": JSON.stringify(bots) });
        }
        if(event.dataset.action === "save")
        {
            const newTitle =  event.closest(".botSetting").querySelector("[name='title']").value;
            console.log(newTitle,bot);
            if(bot !== newTitle)
            {
                bots = changeKey(bots, bot, newTitle);
                bot = newTitle;
            }
            console.log(bots);
            bots[bot].state = event.closest(".botSetting").querySelector("[name='botState']").value;
            bots[bot].link = event.closest(".botSetting").querySelector("[name='url']").value;
            storageSet({ "botList": JSON.stringify(bots) });
        }
        initBotListSettings();
        // chatBots = Object.keys(bots);
        // const botEl = document.querySelector("#botList");
        // botEl.innerHTML = "";
        // for(const bot of Object.keys(bots))
        //     botEl.innerHTML += getBotTemplate(bot, bots[bot]);

        // document.querySelectorAll(".botTemplate").forEach(button => button.addEventListener("click", botAction));
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
