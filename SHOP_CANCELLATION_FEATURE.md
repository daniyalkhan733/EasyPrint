# Shop Order Cancellation Feature

## Overview
Shop owners can now cancel orders with predefined reasons. This provides flexibility for handling situations where orders cannot be fulfilled.

## Features

### 1. Shop-Side Cancellation
- **Availability**: Shop owners can cancel any order that is not yet completed
- **No Time Limit**: Unlike student cancellations (5 min for logged-in, 1 min for guest), shop cancellations have no time restrictions
- **Automatic Refunds**: Full refund issued to student's wallet if they are a logged-in user
- **Status Restrictions**: Cannot cancel orders with "Completed" status

### 2. Cancellation Reasons
Shop owners must select one of the following predefined reasons:
- Out of paper/supplies
- Printer not working
- Too busy - cannot fulfill
- Shop closing early
- Cannot print these files
- Student requested specific changes
- Other technical issues

### 3. User Interface
- **Cancel Button**: Appears next to the status dropdown in order details
- **Modal Confirmation**: Interactive modal with radio button selection for reasons
- **Visual Feedback**: Warning icon and clear messaging about refund implications
- **Toast Notifications**: Success/error messages with refund amount display

## API Endpoint

### POST `/api/orders/<order_id>/cancel/shop`

**Request Body:**
```json
{
  "shop_id": "shop_12345",
  "cancellation_reason": "Out of paper/supplies"
}
```

**Success Response (200):**
```json
{
  "message": "Order cancelled successfully by shop",
  "order_id": "ORD_xyz",
  "refund_amount": 50.00,
  "status": "Cancelled",
  "cancellation_reason": "Out of paper/supplies"
}
```

**Error Responses:**
- `400`: Missing shop_id, order already cancelled, or order completed
- `403`: Order does not belong to this shop
- `404`: Order not found

## Implementation Details

### Backend (backend/app.py)
- **New Endpoint**: `/api/orders/<order_id>/cancel/shop`
- **Validations**:
  - Verifies shop ownership of the order
  - Prevents cancellation of completed orders
  - Prevents duplicate cancellations
- **Refund Logic**:
  - Calculates total cost from file configurations
  - Uses `estimatedCost` if available, otherwise calculates from pages and pricing
  - Adds refund transaction to wallet with detailed reason
- **Order Update**:
  - Sets status to "Cancelled"
  - Records `cancelled_at` timestamp
  - Records `cancelled_by` as "shop"
  - Stores `cancellation_reason`

### Frontend (ShopDashboard.tsx)
- **State Management**:
  - `isCancelModalOpen`: Controls modal visibility
  - `selectedCancelOrder`: Stores order being cancelled
  - `cancelReason`: Stores selected cancellation reason
  - `isCancelling`: Loading state during API call
- **Cancel Modal**:
  - Animated entry/exit with framer-motion
  - Radio button selection for reasons
  - Warning message about automatic refunds
  - Disabled state when no reason selected
- **Order Details Section**:
  - Cancel button appears for non-completed, non-cancelled orders
  - Positioned next to status dropdown
  - Red color scheme for clear visibility

### API Integration (lib/api.ts)
- **New Endpoint**: `orderCancelShop: (orderId) => /api/orders/${orderId}/cancel/shop`

## User Flow

1. **Shop owner views order details** in the active orders section
2. **Clicks "Cancel Order" button** next to the status dropdown
3. **Modal opens** displaying order ID and cancellation warning
4. **Selects a reason** from the predefined list (radio buttons)
5. **Clicks "Cancel Order"** to confirm (or "Keep Order" to dismiss)
6. **System processes cancellation**:
   - Validates shop ownership
   - Calculates refund amount
   - Updates order status to "Cancelled"
   - Credits student's wallet (if logged-in user)
   - Records cancellation details
7. **Success toast** displays confirmation with refund amount
8. **Order moves** to completed/cancelled view

## Edge Cases Handled

1. **Completed Orders**: Cannot be cancelled - button hidden
2. **Already Cancelled**: Prevented by backend validation
3. **Wrong Shop**: Backend validates order belongs to requesting shop
4. **Guest Users**: No wallet refund, but order still cancelled
5. **Network Errors**: Toast notification displays error message
6. **No Reason Selected**: Submit button disabled until reason chosen

## Differences from Student Cancellation

| Feature | Student Cancellation | Shop Cancellation |
|---------|---------------------|-------------------|
| Time Limit | 5 min (logged) / 1 min (guest) | No time limit |
| Status Check | Only "Pending" orders | Any except "Completed" |
| Reason Required | No (auto: "Cancelled by customer") | Yes (predefined list) |
| Who Can Cancel | Order owner only | Order's assigned shop only |
| Refund | Automatic | Automatic |
| UI Location | Order detail page (student view) | Shop dashboard order details |

## Testing Checklist

- [ ] Shop can cancel pending orders with reason selection
- [ ] Shop can cancel "In Progress" orders
- [ ] Shop can cancel "Ready for Pickup" orders
- [ ] Shop cannot cancel completed orders (button hidden)
- [ ] Shop cannot cancel another shop's orders (403 error)
- [ ] Refund correctly calculated and applied to wallet
- [ ] Refund transaction recorded with shop cancellation reason
- [ ] Order status updated to "Cancelled" across all views
- [ ] Toast notifications display correctly
- [ ] Modal opens and closes smoothly with animations
- [ ] All 7 cancellation reasons selectable
- [ ] Cancel button disabled when no reason selected
- [ ] Cancelled orders appear in completed section
- [ ] Guest user orders can be cancelled (no refund)
- [ ] Network errors handled gracefully

## Security Considerations

- Shop ID verification prevents unauthorized cancellations
- Order ownership validated at backend level
- Cannot cancel another shop's orders
- Idempotent design: re-cancelling returns error, not duplicate refund
- Refund amount calculated server-side, not client-provided

## Future Enhancements

- [ ] Custom reason input field for "Other"
- [ ] Notification to student about cancellation
- [ ] Cancellation history/analytics for shops
- [ ] Penalty system for frequent cancellations
- [ ] Partial cancellation (specific files only)
- [ ] Cancellation notes visible to student
