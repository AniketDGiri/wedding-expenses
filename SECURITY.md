# Securing Your Firebase Database

## Important: Firebase API Keys are Public by Design

Your Firebase API key in the client code is **NOT a secret**. It's meant to be public. Firebase security comes from **Firestore Security Rules**, not from hiding the API key.

## Step 1: Set Up Firebase Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `wedding-expenses-f62b6`
3. Go to **Firestore Database** → **Rules**
4. Replace the rules with one of the options below:

### Option A: Password-Protected Access (Best for Personal Use)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{document=**} {
      // Only allow access if user provides the correct password
      allow read, write: if request.auth != null || 
                         request.resource.data.accessPassword == "YourSecretPassword123";
    }
  }
}
```

### Option B: IP/Domain Restriction (Recommended)

1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" → Web app
3. Click "App Check" → "Get started"
4. Register your Netlify domain (e.g., `yoursite.netlify.app`)
5. Use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Option C: Simple Read/Write (Only for Testing)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{document=**} {
      allow read, write: if true;  // Warning: Anyone can access
    }
  }
}
```

## Step 2: Additional Security - API Key Restrictions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your API key (starts with `AIzaSy...`)
5. Click on it → **Application restrictions**
6. Select **HTTP referrers (web sites)**
7. Add your domains:
   - `https://yoursite.netlify.app/*`
   - `http://localhost/*` (for local testing)
8. Click **Save**

## Step 3: Deploy to Netlify

Your current code is fine to deploy as-is. The API key being visible is normal and secure when combined with the above rules.

## Why This Works

- ✅ Firebase API keys identify your project (like a username)
- ✅ Security Rules control what data can be accessed
- ✅ API restrictions limit which domains can use the key
- ✅ This is how ALL client-side Firebase apps work (including Google's own apps)

## What NOT to Do

- ❌ Don't try to hide the API key in environment variables (won't work for static sites)
- ❌ Don't use server-side keys in client code
- ❌ Don't overthink it - this is the standard Firebase security model

Your data is protected by Security Rules, not by hiding the API key!
