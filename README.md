# Gemini Prompt Finder (Chrome Extension)

This Chrome extension finds images on the current page and sends them to the
Gemini API to generate a descriptive prompt you can reuse for generative AI
workflows.

## Features
- Collects unique image URLs on the active tab.
- Calls Gemini API with an image + prompt.
- Builds a short prompt from the returned text.

## Setup
1. Create a Google Cloud project and enable the Gemini API.
2. Generate an API key for the Gemini API.
3. Load this folder as an unpacked extension in Chrome.
4. Open the extension **Options** page and paste your API key.
5. Navigate to any webpage and click **Analyze images**.

## Notes
- The extension sends each image to Gemini; usage counts against your
  project quota.
- Images behind auth/CORS restrictions or unsupported formats (like SVG) might fail to fetch.
- Results are displayed inside the extension popup.
