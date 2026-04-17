# How to Test Fraud Detection — Step by Step Demo Guide

## Setup
1. Make sure backend is running: `cd backend && npm run dev`
2. Make sure `DEMO_MODE=true` in `backend/.env`
3. Log in as a worker (e.g., `harshith@test.com`)
4. Open admin panel in another tab: `http://localhost:3000/admin/login`
   - Email: `admin@phoeraksha.com` | Password: `Admin@123`

---

## TEST 1: GPS SPOOFING DETECTION

**Goal:** Show that a worker cannot fake their location.

**Steps:**
1. In worker dashboard, open browser DevTools -> Application -> Local Storage
2. Note the worker's stored city (e.g., Chennai, lat: 13.08, lon: 80.27)
3. In backend, temporarily call the location-ping endpoint with a spoofed location:
   ```
   POST /api/user/location-ping
   { latitude: 28.6139, longitude: 77.2090 }
   ```
4. Then use Demo Mode -> Traffic Jam scenario -> Force Trigger
5. Check admin panel -> Fraud Alerts:
   - New alert appears: `GPS_SPOOFING`
   - Shows distance jump reasoning
   - Payout status shows under review/held

---

## TEST 2: NEIGHBOR MISMATCH DETECTION

**Goal:** Show that a traffic jam claim with no nearby workers is flagged.

**Steps:**
1. Keep only one worker active nearby
2. Use Demo Mode -> Traffic Jam -> Force Trigger
3. Check admin -> Fraud Alerts:
   - Alert type: `NEIGHBOR_MISMATCH`
   - Cluster map shows isolated claim

To make it pass:
1. Login second worker in same city
2. Trigger Traffic Jam in both sessions within 5 minutes
3. Check second claim gets approved if corroborated

---

## TEST 3: BEHAVIOR ANOMALY — DUPLICATE CLAIMS

**Goal:** Show rapid duplicate same-type claims are flagged.

**Steps:**
1. Trigger Heavy Rain once
2. Trigger Heavy Rain again inside 3 hours
3. Check admin -> Fraud Alerts:
   - Alert type: `BEHAVIOR_ANOMALY`
   - Second payout is held for review

---

## TEST 4: LEGITIMATE CLAIM — PASSES CHECKS

**Goal:** Show valid trigger flow remains approved.

**Steps:**
1. Toggle Demo Mode OFF
2. Wait for scheduled trigger evaluation
3. Check admin -> Payouts:
   - Status: `credited`
4. Fraud Alerts should not create a false-positive for that event

---

## VISUALIZING FRAUD IN ADMIN DASHBOARD

1. Open `/admin/dashboard/fraud`
2. Use filter by `GPS_SPOOFING`, `NEIGHBOR_MISMATCH`, etc.
3. Click an alert card to inspect map context
4. Use `Approve Payout` or `Reject & Penalize` to resolve

---

## KEY JUDGE TALKING POINTS

1. Three independent fraud signals are combined
2. Cluster validation checks neighborhood corroboration for location-specific claims
3. GPS spoofing is detected using impossible travel speed
4. All events retain JSON evidence for explainable audits
5. Admins can resolve held payouts with full context
