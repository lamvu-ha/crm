<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/51250301-79ea-4135-a468-984e90b1a647

## Run Locally

### Isolated demo

From the repository root, run `npm.cmd run dev` on Windows (or `npm run dev` on macOS/Linux), then open http://127.0.0.1:3001. Sign in with `admin` and password `Demo@2026!`.

The demo uses synthetic records stored under `demo-isolated` and does not connect to Firestore. To run the original server separately, use `npm.cmd run dev:main`.

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
