const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "models/gemini-1.5-pro:generateContent";

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
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unsupported content type: ${contentType || "unknown"}`);
  }
  if (contentType.includes("svg")) {
    throw new Error("Unsupported image type: SVG");
  }
  const blob = await response.blob();
  return {
    base64: await blobToBase64(blob),
    mimeType: contentType || blob.type || "image/png"
  };
}

function buildPromptFromResponse(imageUrl, response) {
  const candidate = response?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts.map((part) => part.text).filter(Boolean).join("\n");

  return {
    imageUrl,
    prompt: text || "No descriptive data returned.",
    raw: candidate || {},
  };
}

async function analyzeImage(url) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("Missing API key. Set it in the extension options.");
  }

  const { base64, mimeType } = await fetchImageBase64(url);
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text:
              "Describe this image and produce a concise prompt for generative AI. " +
              "Include subject, style, lighting, composition, and notable details."
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          }
        ]
      }
    ]
  };

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${GEMINI_MODEL}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
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
          try {
            const result = await analyzeImage(url);
            results.push(result);
          } catch (error) {
            results.push({
              imageUrl: url,
              prompt: `Error: ${error.message}`,
              raw: {}
            });
          }
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
