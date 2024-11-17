/* eslint-disable no-undef */

let disabledBots = [];
let predefinedPrompts = [];
let editingID = -1;
let submitByCtrlEnter = false;
let storage = async () => await chrome.storage.local.get(["disabledChatbots", "predefinedPrompts", "ctrlEnter"]);
const chatBots = ["ChatGPT", "Claude", "Gemini", "Bing", "Perplexity"];
let allData = {};
let storageSet = async (data) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage"))
        await chrome.storage.local.set(data);
    else
        localStorage.setItem(Object.keys(data)[0], Object.values(data)[0]);
};
let storageGet = (key) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        if (Object.prototype.hasOwnProperty.call(allData, key)) {
            return allData[key];
        }
        else return null;
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
document.addEventListener("DOMContentLoaded", async function () {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        document.querySelectorAll(".websiteVisible").forEach((element) => element.style.display = "none");
        allData = await storage();
        console.log(allData);
    } else {
        document.querySelectorAll(".extVisisble").forEach((element) => element.style.display = "none");
    }
    disabledBots = JSON.parse(storageGet("disabledChatbots")) || [];
    for (let i = 0; i < chatBots.length; i++) {
        if (disabledBots.includes(chatBots[i])) continue;
        document.querySelector(`.chat_button[value="${chatBots[i]}"]`).classList.remove("disabled");
    }

    document.querySelector("#geminiInfo").style.display = document.querySelector(".chat_button[value=\"Gemini\"]:not(.disabled)") ? "block" : "none";

    predefinedPrompts = JSON.parse(storageGet("predefinedPrompts")) || [...setOfPredefinedPrompts];
    addPredefinedButtons();
    submitByCtrlEnter = JSON.parse(storageGet("ctrlEnter")) || false;

    if (submitByCtrlEnter) {
        document.querySelector("#ctrlEnter").checked = true;
    }
    document.querySelector("#ctrlEnter").addEventListener("change", () => {
        submitByCtrlEnter = document.querySelector("#ctrlEnter").checked;
        // localStorage.setItem('ctrlEnter', JSON.stringify(document.querySelector('#ctrlEnter').checked));
        storageSet({ "ctrlEnter": JSON.stringify(document.querySelector("#ctrlEnter").checked) });
    });

    document.querySelectorAll(".chat_button").forEach((button) => {
        button.addEventListener("click", () => {

            if (disabledBots.includes(button.value)) {
                disabledBots.splice(disabledBots.indexOf(button.value), 1);
                button.classList.remove("disabled");
            } else {
                disabledBots.push(button.value);
                button.classList.add("disabled");
            }
            document.querySelector("#geminiInfo").style.display = document.querySelector(".chat_button[value=\"Gemini\"]:not(.disabled)") ? "block" : "none";
            // localStorage.setItem('disabledChatbots', JSON.stringify(disabledBots));
            storageSet({ "disabledChatbots": JSON.stringify(disabledBots) });
        });
    });

    document.querySelector("#query").addEventListener("keydown", function (event) {
        if (!document.querySelector("#query").value.length) return;
        if (event.key === "Enter") {
            if (!event.ctrlKey && submitByCtrlEnter) return;
            event.preventDefault();
            openChatBots(document.querySelector("#query").value);
        }
    });
    document.addEventListener("contextmenu", (event) => {
        if (event.target.classList.contains("prefPromptButton")) {
            event.preventDefault();

            editingID = parseInt(event.target.dataset.id);
            if (editingID == undefined) return alert("Error, no ID found");

            document.querySelector("[name=\"promptName\"]").value = predefinedPrompts[editingID].title;
            document.querySelector("[name=\"prompt\"]").value = predefinedPrompts[editingID].prompt;

            openModal(document.getElementById("edit-modal"));
        }
    });

    document.addEventListener("mouseup", (event) => {
        if (!document.querySelector("#query").value.length) return;
        if (event.button === 0 && event.target.classList.contains("prefPromptButton")) {
            const promptID = parseInt(event.target.dataset.id);
            let text = predefinedPrompts[promptID].prompt + "\n" + document.querySelector("#query").value;
            openChatBots(text);
        }
    });

    document.querySelector(".mainAsk").addEventListener("click", () => {
        if (!document.querySelector("#query").value.length) return;
        openChatBots(document.querySelector("#query").value);
    });


    document.addEventListener("mousedown", (event) => {
        if (event.button === 1 && event.target.classList.contains("prefPromptButton")) {

            editingID = parseInt(event.target.dataset.id);
            if (editingID == undefined) alert("Error, no ID found");

            predefinedPrompts = moveElementUp(predefinedPrompts, editingID);

            addPredefinedButtons();

            // localStorage.setItem('predefinedPrompts', JSON.stringify(predefinedPrompts));
            storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
        }
    });
    document.querySelector("#addNew").addEventListener("click", (event) => {
        editingID = -1;
        document.querySelector("[name=\"promptName\"]").value = "";
        document.querySelector("[name=\"prompt\"]").value = "";
        toggleModal(event);
    });
    document.querySelector("#shortcutEditor").addEventListener("click", () => {
        chrome.runtime.sendMessage({
            action: "openShortcutEditor"
        });
    });
    document.querySelectorAll(".closeEvent").forEach((button) => {
        button.addEventListener("click", (event) => {
            toggleModal(event);
        });
    });
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        let keys = await chrome.commands.getAll();
        if (keys.length) document.querySelector("#shortcutEditor").innerText = `✏️ ${keys[0].shortcut}`;
    }
    updateChatButtonsWidth();
    window.addEventListener("resize", updateChatButtonsWidth);

});
let updateChatButtonsWidth = () => {
    document.querySelector("#chatButtons").style.width = document.querySelector("#mainBox").getBoundingClientRect().width.toString() + "px";
};
let addPredefinedButtons = () => {
    
    [...document.querySelectorAll(".askButtons .buttons button:not(#addNew)")].map((button) => button.remove());

    for (let i = 0; i < predefinedPrompts.length; i++)
        document.querySelector(".askButtons .buttons").insertAdjacentHTML("beforeend", `<button class="outline prefPromptButton" data-id="${i}">${predefinedPrompts[i].title}</button>`);
};
let openChatBots = (query) => {
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
    const chatBotsReversed = chatBots.slice().reverse();
    for (const bot of chatBotsReversed) {
        if (disabledBots.includes(bot)) continue;
        if (bot == "Perplexity") {
            window.open(`https://www.perplexity.ai/search/new?q=${prompt}`, "_blank");
        }
        else if (bot == "Bing") {
            window.open(`https://www.bing.com/chat?q=${prompt}&sendquery=1&FORM=SCCODX`, "_blank");
        }
        else if (bot == "Gemini") {
            window.open(`https://gemini.google.com/app?q=${prompt}`, "_blank");
        }
        else if (bot == "Claude") {
            window.open(`https://claude.ai/new?q=${prompt}`, "_blank");
        }
        else if (bot == "ChatGPT") {
            window.open(`https://www.chatgpt.com/?q=${prompt}`, "_blank");
        }

    }

};

document.querySelector("#savePrompt").addEventListener("click", (event) => {
    toggleModal(event);
    let title = document.querySelector("input[name=\"promptName\"]").value;
    let prompt = document.querySelector("textarea[name=\"prompt\"]").value;
    if(editingID != -1) predefinedPrompts[editingID] = { title, prompt };
    else
    predefinedPrompts.push({ title, prompt });
    editingID = -1;
    // localStorage.setItem('predefinedPrompts', JSON.stringify(predefinedPrompts));
    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
    addPredefinedButtons();

    document.querySelector("[name=\"promptName\"]").value = "";
    document.querySelector("[name=\"prompt\"]").value = "";
});

document.querySelector("#deletePrompt").addEventListener("click", (event) => {
    toggleModal(event);

    if (editingID == -1) return;
    predefinedPrompts.splice(editingID, 1);

    // localStorage.setItem('predefinedPrompts', JSON.stringify(predefinedPrompts));
    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });

    document.querySelector("[name=\"promptName\"]").value = "";
    document.querySelector("[name=\"prompt\"]").value = "";

    document.querySelectorAll(".askButtons .buttons button").forEach((button) => {
        if (button.dataset.id == editingID) {
            button.remove();
        }
    });
});

function moveElementUp(array, index) {
    if (index < 0 || index >= array.length) {
        throw new Error("Index out of bounds");
    }
    const newIndex = (index + 1) % array.length;
    const element = array[index];
    array.splice(index, 1);
    array.splice(newIndex, 0, element);

    return array;
}
