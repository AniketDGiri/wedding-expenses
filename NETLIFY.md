# Deployment Instructions for Netlify

## Quick Deploy (Drag & Drop)

1. Go to [netlify.com](https://www.netlify.com/)
2. Sign up or log in
3. Click "Add new site" → "Deploy manually"
4. Drag and drop your entire `shaadi-expenses` folder
5. Done! You'll get a URL like `random-name-123.netlify.app`

## Environment Variables Method (Hide Firebase Keys)

If you want to hide Firebase credentials from GitHub:

### Step 1: Remove firebase-config.js from Git

```bash
git rm --cached firebase-config.js
git commit -m "Remove Firebase config from repo"
git push
```

### Step 2: Set Up Netlify Environment Variables

1. Go to your site on Netlify
2. Click **Site settings** → **Environment variables**
3. Add these variables:
   - `FIREBASE_API_KEY` = `AIzaSyCgXPZrqozPlNbQ-ViqCYt1GkvI3Ro_Ixw`
   - `FIREBASE_AUTH_DOMAIN` = `wedding-expenses-f62b6.firebaseapp.com`
   - `FIREBASE_PROJECT_ID` = `wedding-expenses-f62b6`
   - `FIREBASE_STORAGE_BUCKET` = `wedding-expenses-f62b6.firebasestorage.app`
   - `FIREBASE_MESSAGING_SENDER_ID` = `565176416758`
   - `FIREBASE_APP_ID` = `1:565176416758:web:724219358d4f1c521f6fd7`

### Step 3: Create Build Script

This won't work for static sites! Environment variables in Netlify are only available during build time, not in the browser.

## ⚠️ Important Note

**For static websites (like yours), you CANNOT hide Firebase API keys completely.** 

The keys will always be visible in the browser's source code. This is normal and secure when you:
1. ✅ Set up Firebase Security Rules (see SECURITY.md)
2. ✅ Restrict API key to your domain in Google Cloud Console

## Recommended Approach

**Just deploy as-is!** Your Firebase API key being public is fine. See `SECURITY.md` for proper security setup.

## Deploy to Netlify

Simply drag and drop these files to Netlify:
- index.html
- style.css
- script.js
- firebase-config.js

Your site will be live in seconds! 🚀
