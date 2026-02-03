function collectImageUrls() {
  const images = Array.from(document.images || []);
  const urls = images
    .map((img) => img.currentSrc || img.src)
    .filter((src) => src && (src.startsWith("http://") || src.startsWith("https://")));

  return Array.from(new Set(urls));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_IMAGES") {
    sendResponse({ imageUrls: collectImageUrls() });
  }
});
