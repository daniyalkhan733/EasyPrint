# Shop Selection & Order Association System

## Overview
This update fixes the issue where orders from any shop were appearing on all shop owner dashboards. Now, students select a specific shop before uploading, and orders are properly associated with that shop.

## Backend Changes

### 1. Order-Shop Association
- **File**: `backend/app.py`
- Added `shop_id` field to orders during creation
- Modified `/api/orders/create` to require `shopId` parameter
- Updated cost calculation to use the selected shop's pricing

### 2. Shop-Specific Order Filtering
- Modified `/api/orders/shop-view` endpoint to filter by `shop_id`
- Now only returns orders for the specified shop

### 3. New Endpoints

#### `/api/shops/active` (GET)
Returns all active shops with their details:
```json
[
  {
    "shop_id": "uuid",
    "shop_name": "Shop Name",
    "location": "Location",
    "pricing": {"bw": 1, "color": 5},
    "profile_photo": "filename.jpg",
    "isLive": true
  }
]
```

#### `/api/shop/<shop_id>/status` (PUT)
Toggles shop online/offline status:
```json
{
  "isLive": true/false
}
```

### 4. Shop Registration Update
- Added `isLive` field (default: true) to shop records

## Frontend Changes

### 1. New Component: ShopSelector
- **File**: `frontend/src/components/ShopSelector.tsx`
- Beautiful card-based shop selection interface
- Displays:
  - Shop name, location, and profile photo
  - Pricing for B&W and color pages
  - Online/offline status with live indicator
  - Visual feedback for selected shop
- Auto-refreshes every 30 seconds to update live status

### 2. FileUpload Component Updates
- **File**: `frontend/src/components/FileUpload.tsx`
- Integrated ShopSelector at the top
- File upload section only shows after shop selection
- Displays selected shop name and location
- Passes `shop_id` when creating orders
- Uses selected shop's pricing for cost calculations

### 3. ShopDashboard Updates
- **File**: `frontend/src/components/ShopDashboard.tsx`
- Modified to fetch orders filtered by shop_id
- Added shop status toggle in Profile tab
- Shows online/offline indicator in header
- Shop owners can toggle their shop availability

### 4. API Endpoints Update
- **File**: `frontend/src/lib/api.ts`
- Added `activeShops` endpoint
- Added `shopToggleStatus` endpoint
- Modified `shopViewOrders` to accept shop_id parameter

## Features

### For Students
1. **Shop Selection**: Before uploading files, students see all available shops with:
   - Shop profile photo
   - Location
   - Pricing (B&W and color per page)
   - Live status indicator

2. **Smart Filtering**: Only online shops are clickable; offline shops are grayed out

3. **Clear Context**: Once a shop is selected, the interface shows which shop they're ordering from

### For Shop Owners
1. **Shop Status Control**: Toggle between online/offline from the Profile tab
   - When offline, shop is hidden from student selection
   - Useful for managing availability (lunch breaks, holidays, etc.)

2. **Order Filtering**: Dashboard only shows orders specific to their shop

3. **Live Indicator**: Header shows current online/offline status with animated indicator

## Testing the Flow

### Step 1: Setup Multiple Shops
1. Register 2-3 shops with different pricing
2. Ensure they are verified by super admin
3. Each shop should have different locations and pricing

### Step 2: Test Shop Selection (Student)
1. Go to student page
2. You should see ShopSelector component with all online shops
3. Select a shop - the file upload section should appear
4. Verify the selected shop's name appears in the header
5. Upload a file and verify the pricing matches the selected shop

### Step 3: Test Order Association
1. Create orders from different shops as a student
2. Login as Shop Owner 1 - should only see orders for Shop 1
3. Login as Shop Owner 2 - should only see orders for Shop 2
4. Orders should NOT appear on all dashboards

### Step 4: Test Shop Status Toggle
1. Login as a shop owner
2. Go to Profile tab
3. Click "Go Offline"
4. Log out and go to student page
5. Verify the shop is not clickable (grayed out with "Offline" status)
6. Login back as shop owner and toggle "Go Online"
7. Verify shop becomes available again for students

## Database Fields

### Orders Collection (`db.json`)
New field added:
```json
{
  "order_id": "order_123456",
  "shop_id": "uuid-of-shop",  // NEW FIELD
  "student_name": "Student Name",
  "files": [...],
  "status": "Pending",
  "order_time": 1234567890
}
```

### Shops Collection (`shops.json`)
New field added:
```json
{
  "shop_id": "uuid",
  "shop_name": "Shop Name",
  "username": "shop1",
  "location": "Location",
  "pricing": {"bw": 1, "color": 5},
  "status": "Active",
  "isLive": true,  // NEW FIELD - controls online/offline
  "profile_photo": "filename.jpg"
}
```

## Benefits

1. **Proper Order Management**: Each shop owner only sees their own orders
2. **Shop Competition**: Students can choose based on pricing and location
3. **Availability Control**: Shop owners can manage when they accept orders
4.  **Better UX**: Clear shop selection with all relevant information upfront
5. **Scalability**: System now supports multiple shops properly

## Potential Enhancements

1. **Shop Ratings**: Allow students to rate shops
2. **Delivery Time**: Add estimated delivery time per shop
3. **Shop Hours**: Display operating hours
4. **Distance Calculator**: Show distance from student location
5. **Favorites**: Allow students to save favorite shops
6. **Order History**: Show per-shop order history for students
