const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

async function getApiKey() {
  const { visionApiKey } = await chrome.storage.sync.get("visionApiKey");
  return visionApiKey || "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchImageBase64(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  return blobToBase64(blob);
}

function buildPromptFromResponse(imageUrl, response) {
  const annotation = response?.responses?.[0] || {};
  const labels = (annotation.labelAnnotations || []).slice(0, 6).map((item) => item.description);
  const webEntities = (annotation.webDetection?.webEntities || [])
    .slice(0, 4)
    .map((item) => item.description)
    .filter(Boolean);
  const bestGuess = annotation.webDetection?.bestGuessLabels?.[0]?.label;

  const promptParts = [
    bestGuess,
    labels.length ? `Labels: ${labels.join(", ")}` : null,
    webEntities.length ? `Related: ${webEntities.join(", ")}` : null,
  ].filter(Boolean);

  return {
    imageUrl,
    prompt: promptParts.join(". ") || "No descriptive data returned.",
    raw: annotation,
  };
}

async function analyzeImage(url) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("Missing API key. Set it in the extension options.");
  }

  const base64Content = await fetchImageBase64(url);
  const requestBody = {
    requests: [
      {
        image: { content: base64Content },
        features: [
          { type: "LABEL_DETECTION", maxResults: 8 },
          { type: "WEB_DETECTION", maxResults: 6 }
        ]
      }
    ]
  };

  const response = await fetch(`${VISION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return buildPromptFromResponse(url, data);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ANALYZE_IMAGES") {
    const { imageUrls } = message;
    (async () => {
      try {
        const results = [];
        for (const url of imageUrls) {
          const result = await analyzeImage(url);
          results.push(result);
        }
        sendResponse({ ok: true, results });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (message?.type === "CHECK_API_KEY") {
    (async () => {
      const apiKey = await getApiKey();
      sendResponse({ ok: true, hasKey: Boolean(apiKey) });
    })();
    return true;
  }

  return false;
});
