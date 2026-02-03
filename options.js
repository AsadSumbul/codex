const apiKeyInput = document.getElementById("apiKey");
const saveButton = document.getElementById("saveButton");
const saveStatus = document.getElementById("saveStatus");

async function loadKey() {
  const { visionApiKey } = await chrome.storage.sync.get("visionApiKey");
  if (visionApiKey) {
    apiKeyInput.value = visionApiKey;
  }
}

function setStatus(message, tone = "") {
  saveStatus.textContent = message;
  saveStatus.className = `status ${tone}`.trim();
}

saveButton.addEventListener("click", async () => {
  const value = apiKeyInput.value.trim();
  if (!value) {
    setStatus("Please enter a valid API key.", "warning");
    return;
  }

  await chrome.storage.sync.set({ visionApiKey: value });
  setStatus("Saved!", "success");
});

loadKey();
