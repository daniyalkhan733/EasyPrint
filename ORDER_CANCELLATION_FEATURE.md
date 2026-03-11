# Order Cancellation Feature - Implementation Summary

## Overview
Implemented a comprehensive order cancellation system with time-based restrictions, automatic refunds, and proper status synchronization between students and shop owners.

## Key Features

### 1. **Time-Based Cancellation Windows**
- **Logged-in Students**: 5 minutes from order placement
- **Guest Users**: 1 minute from order placement
- Real-time countdown display showing remaining cancellation time

### 2. **Status-Based Restrictions**
Orders can ONLY be cancelled when status is **"Pending"**

**Cannot be cancelled when:**
- In Progress
- Ready for Pickup
- Completed
- Already Cancelled

### 3. **Automatic Coin Refunds**
- Logged-in users receive automatic EP-Coin refunds
- Refund amount matches the original order cost
- Refund transaction is recorded in wallet history
- Guest users don't have coins (no refund needed)

### 4. **User Verification**
- Backend validates order ownership via `user_id` or `session_id`
- Prevents unauthorized cancellations
- Separate handling for logged-in vs guest users

## Technical Implementation

### Backend Changes (`backend/app.py`)

#### New Endpoint: `POST /api/orders/<order_id>/cancel`

**Request Body:**
```json
{
  "user_id": "uuid-string",  // For logged-in users
  "session_id": "uuid-string" // For guest users
}
```

**Response (Success):**
```json
{
  "message": "Order cancelled successfully",
  "order_id": "order_123456",
  "refund_amount": 25.50,
  "status": "Cancelled"
}
```

**Response (Error - Time Expired):**
```json
{
  "error": "Cancellation window expired. Orders can only be cancelled within 5 minutes of placement.",
  "elapsed_seconds": 320,
  "time_limit": 300
}
```

**Response (Error - Status):**
```json
{
  "error": "Cannot cancel order with status 'In Progress'. Only pending orders can be cancelled."
}
```

#### Validation Logic:
1. ✅ Verify order exists
2. ✅ Verify user owns the order
3. ✅ Check order not already cancelled
4. ✅ Check order status is "Pending"
5. ✅ Validate time window (5 min logged / 1 min guest)
6. ✅ Calculate and process refund for logged-in users
7. ✅ Update order status to "Cancelled"
8. ✅ Record refund transaction in wallet

### Frontend Changes

#### 1. **API Endpoint** (`frontend/src/lib/api.ts`)
```typescript
orderCancel: (orderId: string) => `${API_URL}/api/orders/${orderId}/cancel`
```

#### 2. **Order Detail Page** (`frontend/src/app/order/[orderId]/page.tsx`)

**New Features:**
- Real-time countdown timer showing time remaining
- "Cancel Order" button (only when eligible)
- Confirmation modal with refund information
- Clear messaging about cancellation status
- Automatic status updates after cancellation

**UI States:**
- ✅ **Can Cancel**: Shows countdown + cancel button
- ⏰ **Time Expired**: Informational message
- 🚫 **Wrong Status**: Explanation of why can't cancel
- ✅ **Cancelled**: Shows cancelled status

**Example Messages:**
```
✓ "You can cancel this order for the next 4:32 (EP-Coins will be refunded)"
✗ "The 5-minute cancellation window has expired. Your order is being processed."
✗ "This order cannot be cancelled as it is already being processed."
```

#### 3. **Orders List Page** (`frontend/src/app/orders/page.tsx`)
- Added "Cancelled" status display (red color scheme)
- Updated status legend to include cancelled state
- Cancelled orders appear in order history

#### 4. **Shop Dashboard** (`frontend/src/components/ShopDashboard.tsx`)
- Cancelled orders show in "Completed" view (separate from active)
- Cancelled status clearly distinguished from completed
- Shop owners can see cancellation information

## User Flows

### Student Cancellation Flow (Logged-in)

1. Student places order → gets 5 minutes to cancel
2. Student goes to order detail page
3. Sees cancellation timer: "4:32 remaining"
4. Clicks "Cancel Order" button
5. Confirmation modal appears with refund info
6. Confirms cancellation
7. Order cancelled, coins refunded automatically
8. Order status updates to "Cancelled"
9. Shop owner sees cancelled order in dashboard

### Guest Cancellation Flow

1. Guest places order → gets 1 minute to cancel
2. Guest goes to order detail page
3. Sees cancellation timer: "0:45 remaining"
4. Clicks "Cancel Order" button
5. Confirmation modal appears
6. Confirms cancellation
7. Order cancelled (no refund - guest mode)
8. Order status updates to "Cancelled"

### Shop Owner View

1. Receives new pending order
2. If student cancels within time window:
   - Order disappears from "Active Orders"
   - Appears in "Completed" section with "Cancelled" status
3. If time expires or shop starts processing:
   - Order cannot be cancelled by student
   - Shop proceeds with printing

## Edge Cases Handled

### ✅ Multiple Cancellation Attempts
- Backend checks if already cancelled
- Returns appropriate message without error

### ✅ Concurrent Status Changes
- Shop marks "In Progress" while student tries to cancel
- Cancellation rejected with status error

### ✅ Time Boundary Cases
- Precise second-level validation
- Clear expiry handling (410 Gone status)

### ✅ Network Issues
- Loading states during cancellation
- Error toasts for failures
- Retry-safe implementation

### ✅ Ownership Verification
- Logged-in users verified by user_id
- Guests verified by session_id
- Prevents cross-user cancellations

### ✅ Refund Calculation
- Uses original shop pricing
- Handles complex order configs (BW/Color mix)
- Records transaction with order reference

## Status Synchronization

### Order Lifecycle:
```
Pending → [5 min window] → In Progress → Ready for Pickup → Completed
   ↓
Cancelled (if within time window)
```

### Real-time Updates:
- Orders page auto-refreshes every 5 seconds
- Order detail page auto-refreshes every 5 seconds
- Shop dashboard auto-refreshes every 5 seconds
- Countdown updates every 1 second

## Testing Checklist

### Logged-in User Tests:
- ✅ Cancel order within 5 minutes → Success + Refund
- ✅ Try cancel after 5 minutes → Error message
- ✅ Try cancel "In Progress" order → Error message
- ✅ Verify coins refunded to wallet
- ✅ Check refund transaction appears in history

### Guest User Tests:
- ✅ Cancel order within 1 minute → Success
- ✅ Try cancel after 1 minute → Error message
- ✅ Verify no refund attempts (no wallet)

### Shop Owner Tests:
- ✅ See cancelled orders in completed section
- ✅ Distinguish cancelled from completed
- ✅ Cannot process cancelled orders

### Concurrent Tests:
- ✅ Shop marks "In Progress" → Student can't cancel
- ✅ Student cancels → Shop sees update immediately

## Security Considerations

1. **Authentication**: Order ownership verified server-side
2. **Time Validation**: Server-side time checking (not trusting client)
3. **Status Validation**: Prevents invalid state transitions
4. **Refund Safety**: Only refunds to original user's wallet
5. **Idempotency**: Multiple cancel attempts handled gracefully

## Performance Optimizations

1. **Efficient Polling**: 5-second intervals for order updates
2. **Countdown Timer**: Local calculation (not server requests)
3. **Conditional Rendering**: UI only shows when relevant
4. **Transaction Recording**: Async wallet updates

## Future Enhancements (Optional)

- [ ] Admin override for cancellations beyond time window
- [ ] Partial cancellation (specific files only)
- [ ] Cancellation reasons dropdown
- [ ] Email/notification on cancellation
- [ ] Analytics dashboard for cancellation rates
- [ ] Configurable time windows per shop

## Files Modified

### Backend:
- `backend/app.py` - Added cancel endpoint and validation logic

### Frontend:
- `frontend/src/lib/api.ts` - Added cancel endpoint
- `frontend/src/app/order/[orderId]/page.tsx` - Full cancellation UI
- `frontend/src/app/orders/page.tsx` - Cancelled status display
- `frontend/src/components/ShopDashboard.tsx` - Shop owner view updates

## Summary

The order cancellation feature is fully implemented with:
- ✅ Time-based restrictions (5 min logged / 1 min guest)
- ✅ Status-based restrictions (only pending orders)
- ✅ Automatic refunds for logged-in users
- ✅ Real-time countdown timers
- ✅ Confirmation dialogs
- ✅ Complete ownership verification
- ✅ Proper error handling
- ✅ Shop owner visibility
- ✅ Status synchronization across all views

**No miscommunication possible** - All parties see consistent status with clear messaging about cancellation availability and restrictions.
