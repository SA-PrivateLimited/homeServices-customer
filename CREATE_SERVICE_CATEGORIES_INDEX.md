# Create Firestore Indexes for Service Categories

## Required Indexes

The `serviceCategories` collection requires composite indexes for efficient querying.

### Index 1: isActive + order (for fetchServiceCategories)

**Collection:** `serviceCategories`  
**Fields:**
- `isActive` - Ascending
- `order` - Ascending

**Query:** `where('isActive', '==', true).orderBy('order', 'asc')`

### Index 2: name + isActive (for getServiceCategoryByName)

**Collection:** `serviceCategories`  
**Fields:**
- `name` - Ascending
- `isActive` - Ascending

**Query:** `where('name', '==', name).where('isActive', '==', true)`

## Quick Fix: Use the Direct Link

The error message provides a direct link to create the index. Click the link in the error message, or:

1. **Copy the full URL from the error message** (it's truncated but clickable)
2. **Or manually create:**

### Method 1: Direct Link (Easiest)

The error message contains a direct link. Click "See More" to see the full URL, or:

1. Go to Firebase Console
2. Navigate to Firestore → Indexes
3. Click "Create Index"
4. Use the settings below

### Method 2: Manual Creation

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **home-services-1ea69**
3. Go to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"**

**For Index 1 (isActive + order):**
- Collection ID: `serviceCategories`
- Fields to index:
  - Field: `isActive`, Order: `Ascending`
  - Field: `order`, Order: `Ascending`
- Query scope: `Collection`
- Click **"Create"**

**For Index 2 (name + isActive):**
- Collection ID: `serviceCategories`
- Fields to index:
  - Field: `name`, Order: `Ascending`
  - Field: `isActive`, Order: `Ascending`
- Query scope: `Collection`
- Click **"Create"**

## Wait for Index Creation

- Index creation can take **2-5 minutes**
- You'll see a "Building" status initially
- Once it shows "Enabled", the queries will work

## Temporary Workaround

Until the index is created, the app will fall back to `DEFAULT_SERVICE_CATEGORIES`, so the app should still function, but it won't show custom categories from Firestore.

## Verify Index Creation

After creating the indexes:

1. Go to Firestore → Indexes
2. Verify both indexes show status "Enabled"
3. Test the app again - the error should be gone

