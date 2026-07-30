# Business Flows

## Booking Creation
Browse Services → Add to Cart → Create Booking → status: pending

## Payment
- Initiate Payment → Successful → Booking status: confirmed
- Initiate Payment → Failed → Retry (loops back) or Booking cancelled if abandoned

## Booking Status Lifecycle
```
pending → confirmed → in_progress → completed
pending → cancelled
confirmed → cancelled
```

## Post-Completion
- Completed → Review submitted (rating + comment)
- Completed → Complaint filed → open → in_progress → resolved → closed

## Query / Contact-Us
Query submitted (open) → Support responds → optionally linked to user_id → closed
