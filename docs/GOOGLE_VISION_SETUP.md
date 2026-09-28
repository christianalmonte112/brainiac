# Google Cloud Vision OCR setup

Brainiac uses **Document Text Detection** for photo uploads. First **1,000 units/month** are free.

## 1. Create / select a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or pick an existing one)

## 2. Enable the Vision API

1. Go to [Enable Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Click **Enable**

## 3. Create an API key

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create credentials** → **API key**
3. Restrict the key (recommended):
   - Application restrictions: none for local/dev, or HTTP referrers / IP as needed
   - API restrictions: **Cloud Vision API** only
4. Copy the key

## 4. Add to Brainiac

**Local** — `.env.local`:

```bash
GOOGLE_CLOUD_VISION_API_KEY=your_key_here
```

**Vercel** — Project → Settings → Environment Variables:

- Name: `GOOGLE_CLOUD_VISION_API_KEY`
- Value: your key
- Environments: **Production** and **Preview**
- Redeploy after saving

## 5. Verify

Upload a book page → Extract. Status should say **Reading with Google Vision…**  
If the key is missing, the app falls back to on-device Tesseract automatically.
