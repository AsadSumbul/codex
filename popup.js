const analyzeButton = document.getElementById("analyzeButton");
const status = document.getElementById("status");
const resultsList = document.getElementById("results");

function setStatus(message, tone = "") {
  status.textContent = message;
  status.className = `status ${tone}`.trim();
}

function renderResults(results) {
  resultsList.innerHTML = "";
  results.forEach((result) => {
    const item = document.createElement("li");
    item.className = "result";

    const link = document.createElement("a");
    link.href = result.imageUrl;
    link.textContent = result.imageUrl;
    link.target = "_blank";
    link.rel = "noreferrer";

    const prompt = document.createElement("p");
    prompt.textContent = result.prompt;

    item.appendChild(link);
    item.appendChild(prompt);
    resultsList.appendChild(item);
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function requestImageUrls(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_IMAGES" }, (response) => {
      resolve(response?.imageUrls || []);
    });
  });
}

async function analyzeImages(imageUrls) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "ANALYZE_IMAGES", imageUrls }, (response) => {
      resolve(response);
    });
  });
}

async function checkApiKey() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CHECK_API_KEY" }, (response) => {
      resolve(response?.hasKey);
    });
  });
}

analyzeButton.addEventListener("click", async () => {
  setStatus("Checking page for images...");
  resultsList.innerHTML = "";

  const hasKey = await checkApiKey();
  if (!hasKey) {
    setStatus("Add your Google Vision API key in Options first.", "warning");
    return;
  }

  const tab = await getActiveTab();
  if (!tab?.id) {
    setStatus("Unable to access the active tab.", "error");
    return;
  }

  const imageUrls = await requestImageUrls(tab.id);
  if (!imageUrls.length) {
    setStatus("No image URLs found on this page.", "warning");
    return;
  }

  setStatus(`Analyzing ${imageUrls.length} image(s)...`);
  analyzeButton.disabled = true;

  const response = await analyzeImages(imageUrls);
  analyzeButton.disabled = false;

  if (!response?.ok) {
    setStatus(response?.error || "Something went wrong.", "error");
    return;
  }

  setStatus("Done. Click a URL to open the image.", "success");
  renderResults(response.results || []);
});
