# Firebase Setup Guide - Wedding Expense Tracker

Your expense tracker now supports **cloud storage** using Firebase! This means your data will be saved permanently and accessible from any device.

## Quick Setup (5 minutes):

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"** or **"Create a project"**
3. Enter project name: `wedding-expenses` (or any name you like)
4. Click **Continue**
5. Disable Google Analytics (not needed) or keep it enabled
6. Click **Create project**
7. Wait for it to finish, then click **Continue**

### Step 2: Set up Firestore Database

1. In the left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** (easier for personal use)
4. Choose a location (select closest to you, e.g., asia-south1 for India)
5. Click **Enable**

### Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** `</>` to add a web app
5. Enter app nickname: `wedding-tracker`
6. Click **"Register app"**
7. You'll see a code snippet with `firebaseConfig`. Copy the values!

### Step 4: Update Your Code

Open `script.js` and replace the Firebase configuration (lines 2-9) with your values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

### Step 5: Test It!

1. Save your changes
2. Open `index.html` in your browser
3. Open browser console (F12) - you should see "Firebase connected successfully!"
4. Add an expense - it will be saved to the cloud!
5. Open the same website on another device - your data will sync!

## Important Notes:

✅ **Data is now stored in the cloud** - accessible from any device  
✅ **Works offline too** - falls back to localStorage if Firebase fails  
✅ **Free tier** - Up to 1GB storage and 50,000 reads/day (more than enough!)  
⚠️ **Test mode expires in 30 days** - See security section below

## Making It Secure (Optional but Recommended):

After 30 days, test mode will expire. To continue using:

1. Go to Firebase Console → Firestore Database → Rules
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{document=**} {
      allow read, write: if true;  // Simple rule for personal use
    }
  }
}
```

3. Click **Publish**

For better security (if you want to share access with specific people), you can add authentication later.

## Troubleshooting:

**Issue:** Console shows "Using localStorage"  
**Fix:** Make sure you replaced the demo API key with your actual Firebase config

**Issue:** "Permission denied" error  
**Fix:** Check that Firestore rules allow read/write access

**Issue:** Data not syncing  
**Fix:** Check browser console (F12) for error messages

## Questions?

- Firebase is **100% free** for small projects like this
- Your data is stored on Google's secure servers
- You can export/download your data anytime from Firebase Console

Enjoy tracking your wedding expenses! 💒🎉
