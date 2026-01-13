# Sharing Functionality Guide

## Overview
This Wedding Expense Tracker now includes Google Docs-style sharing functionality that allows you to share your expense tracker with other users and grant them either **View** or **Edit** permissions.

## Features

### 1. **Share Button**
- Located in the header next to "View Vendors" and "View Payments" buttons
- Opens a sharing modal where you can manage access

### 2. **Permission Levels**

#### Owner
- Full access to all features
- Can add, edit, and delete expenses
- Can share with others
- Can remove shared access

#### Can Edit
- Can view all expenses
- Can add new expenses
- Can edit existing expenses
- Can delete expenses
- Cannot manage sharing settings

#### Can View
- Can only view expenses
- Cannot add, edit, or delete expenses
- Read-only access to all data
- View-only indicator shown on action buttons

### 3. **Sharing Modal Features**

#### Add People
- Enter email address of the person you want to share with
- Select permission level: "Can View" or "Can Edit"
- Click "Add" to grant access

#### People with Access
- Shows list of all users who have access
- Owner is always listed first
- View or Edit permission badges for each user
- Remove button to revoke access (owner only)

#### Share Link (Future Enhancement)
- Generate shareable links
- Copy link to clipboard

## How to Use

### Sharing Your Tracker

1. **Click the "🔗 Share" button** in the header
2. **Enter the email address** of the person you want to share with
3. **Select permission level**:
   - Choose "Can View" for read-only access
   - Choose "Can Edit" for full editing access
4. **Click "Add"** to grant access
5. The person will now be able to see your expenses in their tracker

### Accessing Shared Trackers

When someone shares their tracker with you:
- Their expenses will automatically appear in your expense list
- Shared expenses show a "Shared by [email]" indicator
- Your permissions determine what actions you can take:
  - **Can View**: You'll see "View Only" instead of Edit/Delete buttons
  - **Can Edit**: You'll see Edit and Delete buttons like normal

### Removing Access

1. Open the sharing modal
2. Find the user in the "People with Access" list
3. Click the "Remove" button next to their name
4. Confirm the removal
5. The user will no longer have access to your tracker

## Firebase Collections

### New Collections Added

#### `sharing` Collection
Stores sharing information for each owner:
```javascript
{
  owner: "userId",
  ownerEmail: "owner@example.com",
  sharedWith: [
    {
      email: "user@example.com",
      permission: "edit" | "view",
      addedAt: Timestamp
    }
  ],
  updatedAt: Timestamp
}
```

#### `sharedWithMe` Collection
Reverse lookup for users to find trackers shared with them:
```javascript
{
  sharedTrackers: [
    {
      ownerId: "userId",
      ownerEmail: "owner@example.com",
      permission: "edit" | "view",
      sharedAt: Timestamp
    }
  ]
}
```

## Firebase Security Rules (Recommended)

Add these security rules to your Firebase Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Expenses collection
    match /expenses/{expenseId} {
      // Allow read if user owns the expense OR if expense is shared with them
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        exists(/databases/$(database)/documents/sharedWithMe/$(request.auth.token.email))
      );
      
      // Allow create if authenticated
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      
      // Allow update/delete if user owns it OR has edit permission
      allow update, delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasEditPermission(resource.data.userId)
      );
    }
    
    // Sharing collection
    match /sharing/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || isSharedWith(userId));
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // SharedWithMe collection
    match /sharedWithMe/{email} {
      allow read: if request.auth != null && request.auth.token.email == email;
      allow write: if request.auth != null;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Helper functions
    function hasEditPermission(ownerId) {
      let sharedDoc = get(/databases/$(database)/documents/sharedWithMe/$(request.auth.token.email));
      return sharedDoc.data.sharedTrackers.hasAny([{
        ownerId: ownerId,
        permission: 'edit'
      }]);
    }
    
    function isSharedWith(ownerId) {
      return exists(/databases/$(database)/documents/sharedWithMe/$(request.auth.token.email));
    }
  }
}
```

## UI Indicators

### Permission Badges
- **Owner** - Orange badge
- **Can Edit** - Green badge
- **Can View** - Blue badge

### Shared Expense Indicators
- Expenses from shared trackers show: "Shared by [owner-email]"
- Small orange badge next to vendor name

### View-Only Mode
- When viewing shared expenses with "view" permission
- "View Only" text appears instead of Edit/Delete buttons
- A banner at the top indicates "👁️ View Only Mode"

## Best Practices

1. **Grant Appropriate Permissions**
   - Use "Can View" for people who just need to see the data
   - Use "Can Edit" only for trusted collaborators

2. **Regular Access Review**
   - Periodically review who has access to your tracker
   - Remove access for people who no longer need it

3. **Communication**
   - Inform people when you share your tracker with them
   - Let them know what they can and cannot do

4. **Data Privacy**
   - Only share with people who need access
   - Remember that "Can Edit" users can modify your data

## Troubleshooting

### Shared expenses not showing up?
- Ensure both users are logged in
- Refresh the page
- Check that the email address is correct

### Can't edit shared expense even with edit permission?
- Verify your permission level in the sharing modal
- Try logging out and back in
- Check browser console for errors

### Permission denied errors?
- Ensure Firebase security rules are properly configured
- Verify the user's email matches the shared email exactly
- Check that the owner hasn't removed your access

## Future Enhancements

Potential improvements for the sharing feature:
- Email notifications when someone shares with you
- Change permission levels without removing and re-adding
- Share via link with expiration dates
- Activity log showing who made what changes
- Commenting on expenses
- Real-time collaboration indicators

## Technical Notes

- Uses Firebase Firestore for data storage
- Real-time updates via Firestore listeners
- Client-side permission enforcement (should be backed by security rules)
- Supports multiple shared trackers per user
