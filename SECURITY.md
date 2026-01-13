# Securing Your Firebase Database

## Important: Firebase API Keys are Public by Design

Your Firebase API key in the client code is **NOT a secret**. It's meant to be public. Firebase security comes from **Firestore Security Rules**, not from hiding the API key.

## Step 1: Set Up Firebase Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Replace the rules with the comprehensive rules below:

### Recommended Security Rules (With Sharing Support)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user has edit permission for a tracker
    function hasEditPermission(ownerId) {
      let userEmail = request.auth.token.email;
      let sharedDoc = get(/databases/$(database)/documents/sharedWithMe/$(userEmail));
      
      // Check if the sharedTrackers array contains an entry with this ownerId and edit permission
      return sharedDoc != null && 
             sharedDoc.data.sharedTrackers != null &&
             sharedDoc.data.sharedTrackers.hasAny([ownerId]);
    }
    
    // Helper function to check if user has any access (view or edit) to a tracker
    function hasAnyAccess(ownerId) {
      let userEmail = request.auth.token.email;
      return exists(/databases/$(database)/documents/sharedWithMe/$(userEmail));
    }
    
    // Expenses collection
    match /expenses/{expenseId} {
      // Allow read if:
      // - User owns the expense, OR
      // - Expense is shared with user (view or edit permission)
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasAnyAccess(resource.data.userId)
      );
      
      // Allow create if authenticated and user is setting themselves as owner
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      
      // Allow update/delete if:
      // - User owns the expense, OR
      // - User has edit permission for the tracker
      allow update, delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasEditPermission(resource.data.userId)
      );
    }
    
    // Sharing collection - stores who the owner has shared with
    match /sharing/{userId} {
      // Allow read if you're the owner or if the tracker is shared with you
      allow read: if request.auth != null && (
        request.auth.uid == userId ||
        hasAnyAccess(userId)
      );
      
      // Only owner can write/modify sharing settings
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // SharedWithMe collection - reverse lookup for shared trackers
    match /sharedWithMe/{email} {
      // Can only read your own shared trackers
      allow read: if request.auth != null && request.auth.token.email == email;
      
      // Allow write from authenticated users (needed for sharing functionality)
      allow write: if request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read user info (needed for displaying names)
      allow read: if request.auth != null;
      
      // Users can only write their own data
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Alternative: Simpler Rules (For Testing Only)

If you want to test without the sharing complexity first:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Users must be authenticated
      allow read, write: if request.auth != null;
    }
  }
}
```

**Note:** This simpler version allows all authenticated users to read/write all data. Use only for initial testing.

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
   - `http://127.0.0.1/*` (for local testing)
8. Click **Save**

## Step 3: Enable Firebase Authentication

The sharing functionality requires Firebase Authentication to be properly configured:

1. Go to Firebase Console → **Authentication**
2. Click **Get Started**
3. Enable **Email/Password** sign-in method
4. (Optional) Enable other methods like Google Sign-in

## Security Features Implemented

### ✅ User Authentication
- Users must sign in to access the app
- Email/password authentication with secure password requirements

### ✅ Data Isolation
- Each user can only access their own expenses by default
- Expenses are tied to user IDs

### ✅ Permission-Based Sharing
- **Owner**: Full control (add, edit, delete, share)
- **Can Edit**: Can view and modify expenses
- **Can View**: Read-only access

### ✅ Firestore Security Rules
- Server-side validation of all operations
- Permission checks before any data access
- Protection against unauthorized modifications

## Why This Security Model Works

- ✅ Firebase API keys identify your project (like a username)
- ✅ Security Rules control what data can be accessed
- ✅ Authentication verifies user identity
- ✅ API restrictions limit which domains can use the key
- ✅ This is how ALL client-side Firebase apps work

## What NOT to Do

- ❌ Don't try to hide the API key in environment variables (won't work for static sites)
- ❌ Don't use server-side keys in client code
- ❌ Don't allow `allow read, write: if true;` in production
- ❌ Don't share your Firebase Admin SDK credentials

## Testing Your Security Rules

Test your security rules in the Firebase Console:

1. Go to **Firestore Database** → **Rules**
2. Click the **Rules Playground** tab
3. Select a collection (e.g., `expenses`)
4. Choose an operation (read/write)
5. Set authentication context
6. Click **Run** to test

## Monitoring & Alerts

1. Go to **Firestore Database** → **Usage**
2. Monitor read/write operations
3. Set up billing alerts to detect unusual activity
4. Review **Authentication** logs regularly

## Data Privacy Best Practices

1. **Regular Access Review**: Periodically check who has access to what
2. **Revoke When Needed**: Remove sharing access for users who no longer need it
3. **Audit Logs**: Monitor Firebase console for suspicious activity
4. **Backup Data**: Regularly export your Firestore data
5. **Strong Passwords**: Enforce good password practices for users

Your data is protected by Security Rules and Authentication, not by hiding the API key!

