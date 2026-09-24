# DhobiDesk — Academic Project Report & Technical Reference Notes

This document provides in-depth technical documentation, mathematical formulations, architectural decisions, and evaluation results for the DhobiDesk final-year project report, dissertation, and viva defense.

---

## 1. Abstract & Motivation

### 1.1 Problem Definition
In university hostels and dense residential facilities, laundry management suffers from several chronic inefficiencies:
- **Blind Commutes**: Students walk across campus to laundry rooms only to find all washing machines occupied or out of service.
- **Machine Hogging & Idle Clothes**: Finished clothes remain in drums for hours because users forget when cycles end, blocking others from using the facilities.
- **Unmanaged Queues**: Physical queues create confusion, conflicts, and arbitrary dispute over who arrived first.
- **Power Cuts & Timer Desynchronization**: Unscheduled electrical interruptions disrupt electromechanical cycles, causing digital timers to reset or display inaccurate completion times.

### 1.2 Proposed Solution
DhobiDesk implements an end-to-end IoT platform:
- **Edge Non-Invasive Sensor Fusion**: Dual-sensor modeling (vibration and current) derives operational states without modifying internal machine wiring.
- **Cloud Telemetry**: HiveMQ Cloud broker transmitting lightweight JSON payloads over MQTT TLS (port 8883).
- **Server-Authoritative Processing**: A Node.js Express bridge executing atomic ACID transactions in Cloud Firestore, enforcing fair-use quotas and automatic turn promotion.
- **Power-Cut State Preservation**: Freezes remaining cycle runtime during outages, shifting completion time and queued slots dynamically upon power restoration.
- **Cross-Platform Progressive Web Application**: React Vite frontend with live countdown timers, dynamic queue wait estimates, and Web Push notifications.

---

## 2. Hardware Simulation & Signal Processing

### 2.1 Sensor Fusion Model
The simulated edge hardware models two non-invasive sensors:
1. **ACS712 Hall-Effect Current Sensor**: Measures AC motor and solenoid power consumption.
2. **ADXL345 3-Axis Accelerometer**: Measures machine drum vibrations along the $x$, $y$, and $z$ axes.

### 2.2 Mathematical Formulations

#### Accelerometer Magnitude ($\|\vec{a}\|$)
$$a_{\text{mag}}(t) = \sqrt{a_x(t)^2 + a_y(t)^2 + a_z(t)^2}$$

#### Rolling Sample Variance ($\sigma_a^2$)
Over a sliding window of $W = 10$ samples:
$$\bar{a} = \frac{1}{W} \sum_{i=0}^{W-1} a_{\text{mag}}(t-i)$$
$$\sigma_a^2(t) = \frac{1}{W-1} \sum_{i=0}^{W-1} (a_{\text{mag}}(t-i) - \bar{a})^2$$

#### Threshold Calibration
Based on statistical sample distributions across labeled states:
- $\text{Threshold}_{\text{idle\_current}} = \mu_{\text{idle, current}} + 3 \cdot \sigma_{\text{idle, current}}$
- $\text{Threshold}_{\text{spin\_var}} = \frac{\mu_{\text{wash, var}} + \mu_{\text{spin, var}}}{2}$

#### State Classification Logic
$$\text{State}(t) = \begin{cases} 
\text{idle}, & \text{if } I(t) < \text{Threshold}_{\text{idle\_current}} \\
\text{spinning}, & \text{if } I(t) \ge \text{Threshold}_{\text{idle\_current}} \text{ and } \sigma_a^2(t) \ge \text{Threshold}_{\text{spin\_var}} \\
\text{washing}, & \text{otherwise}
\end{cases}$$

### 2.3 Debounce Filter State Machine
To prevent erratic state flickering caused by transient electrical spikes or temporary unbalanced loads, a 5-sample consecutive debounce filter is applied:
- A candidate state must sustain $N \ge 5$ consecutive sensor epochs before the system admits a confirmed state transition.

---

## 3. Power-Cut Fault Tolerance & Dynamic Shift Recovery

### 3.1 Power-Cut Detection
When a machine abruptly loses power:
1. The machine transitions from `washing` or `spinning` to `offline` (either explicitly via edge power-loss capacitor telemetry or implicitly via the 90-second stale-data watchdog).
2. The bridge queries the active booking for that machine:
   $$\Delta t_{\text{remaining}} = \max\left(0, t_{\text{expectedEnd}} - t_{\text{current}}\right)$$
3. The booking document is updated:
   - `machineOffline: true`
   - `offlineSince: Timestamp.now()`
   - `shifted: true`
   - `remainingMsAtPause: ` $\Delta t_{\text{remaining}}$
   - `originalEndAt: ` $t_{\text{expectedEnd}}$

### 3.2 Power Restoration & Recovery Shift
When power returns and the machine reports an active state:
1. The bridge recomputes the new expected completion timestamp:
   $$t_{\text{newEnd}} = t_{\text{resume}} + \Delta t_{\text{remaining}}$$
2. All downstream queued bookings ($i = 0, 1, \dots, K-1$) on that machine are shifted forward:
   $$t_{\text{estStart}, i} = t_{\text{newEnd}} + i \cdot T_{\text{cycle}}$$
   *(where $T_{\text{cycle}} = \text{cycleDurationMinutes} \times 60 \times 1000$ ms, default: 30 minutes).*
3. An FCM push alert is dispatched to notify the active user of their updated completion time.

---

## 4. Booking Engine & Queue Management

### 4.1 Daily Booking Quota
- To prevent slot hoarding, each student is restricted to $N_{\text{max}} = 2$ bookings per calendar day ($YYYY-MM-DD$).
- Evaluated inside an atomic Firestore transaction (`db.runTransaction()`):
  $$\text{If } \text{Date}_{\text{last}} = \text{Date}_{\text{today}} \text{ and } C_{\text{daily}} \ge 2 \implies \text{Reject (HTTP 429)}$$
  $$\text{If } \text{Date}_{\text{last}} \ne \text{Date}_{\text{today}} \implies C_{\text{daily}} \leftarrow 1, \text{Date}_{\text{last}} \leftarrow \text{Date}_{\text{today}}$$

### 4.2 FIFO Queue Assignment
- If the machine is free (`status` $\in \{\text{idle}, \text{done}\}$) and has no active or queued bookings:
  - `status` $\leftarrow$ `active`
  - `queuePosition` $\leftarrow 0$
  - `startedAt` $\leftarrow t_{\text{now}}$
  - `expectedEndAt` $\leftarrow t_{\text{now}} + T_{\text{cycle}}$
- If the machine is in use:
  - `status` $\leftarrow$ `queued`
  - `queuePosition` $\leftarrow \max(Q) + 1$
  - `estimatedStartAt` $\leftarrow t_{\text{activeEnd}} + (\text{queuePosition} - 1) \cdot T_{\text{cycle}}$

### 4.3 Turn Promotion & Queue Renumbering
- When an active cycle is cancelled or finishes (`done`):
  1. The next in line (`queuePosition == 1`) is atomically promoted:
     - `status` $\leftarrow$ `active`
     - `queuePosition` $\leftarrow 0$
     - `startedAt` $\leftarrow t_{\text{now}}$
     - `expectedEndAt` $\leftarrow t_{\text{now}} + T_{\text{cycle}}$
  2. All remaining queued slots ($i = 1, 2, \dots$) are renumbered:
     - `queuePosition` $\leftarrow i$
     - `estimatedStartAt` $\leftarrow t_{\text{promotedEnd}} + (i - 1) \cdot T_{\text{cycle}}$
  3. An FCM push alert is triggered: *"Machine is free — It is now your turn."*

---

## 5. Database Schema & Security Architecture

### 5.1 Firestore Document Collections

#### Collection: `machines/{machineId}`
```json
{
  "status": "idle | washing | spinning | done | offline",
  "lastUpdated": "Timestamp",
  "lastEventTimestamp": 1774345678.12,
  "cycleDurationMinutes": 30,
  "queueLength": 2,
  "hasActiveBooking": true,
  "activeBookingExpectedEndAt": "Timestamp",
  "activeBookingOffline": false
}
```

#### Collection: `bookings/{bookingId}`
```json
{
  "machineId": "machine_01",
  "userId": "firebase_auth_uid",
  "status": "active | queued | done | collected | cancelled",
  "queuePosition": 0,
  "startedAt": "Timestamp",
  "expectedEndAt": "Timestamp",
  "estimatedStartAt": null,
  "originalEndAt": "Timestamp",
  "remainingMsAtPause": 1245000,
  "machineOffline": false,
  "shifted": true,
  "createdAt": "Timestamp",
  "notifiedAt": "Timestamp",
  "reminderSent": false
}
```

#### Collection: `users/{userId}`
```json
{
  "dailyBookingCount": 1,
  "lastBookingDate": "2026-09-24",
  "fcmToken": "cK8J...web_push_registration_token",
  "notificationsEnabled": true
}
```

### 5.2 Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }

    // Users: only owner can read; can only write fcmToken & notificationsEnabled
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create, update: if isOwner(userId)
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['notificationsEnabled', 'fcmToken']);
      allow delete: if false;
    }

    // Machines: publicly readable by authenticated students, zero client writes
    match /machines/{machineId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }

    // Bookings: private to booking owner, zero client writes (bridge writes all)
    match /bookings/{bookingId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if false;
    }

    match /{document=**} { allow read, write: if false; }
  }
}
```

---

## 6. Evaluation & Test Results

### 6.1 Automated Test Execution Summary
- **Python Pytest Suite** (`simulation/tests/`):
  - `test_rolling_variance`: PASS (Verified variance computation accuracy)
  - `test_calibrate_thresholds`: PASS (Verified threshold extraction)
  - `test_classify_stream_and_debounce`: PASS (Verified debounce noise rejection)
  - `test_evaluate_accuracy`: PASS (Classification accuracy > 95% on realistic dataset)
  - `test_save_and_resume_state`: PASS (Verified JSON state serialization across reboots)
  - `test_simulate_power_loss`: PASS (Verified exact state matching on power loss cutoff)
  - `test_simulate_watchdog_hang`: PASS (Verified 5s heartbeat timeout detection)
  - *Result*: **7 passed in 0.98s**

- **Node.js Test Suite** (`bridge/test/booking_logic.test.js`):
  - Daily quota enforcement (bookings 1 & 2 allowed, booking 3 rejected with 429): PASS
  - Daily quota rollover on next day (`lastBookingDate !== today`): PASS
  - Free machine assignment (`active`, `queuePosition = 0`): PASS
  - Busy machine queueing (`queued`, `queuePosition = 1, 2...`): PASS
  - Queue turn promotion on active cancellation (`queuePosition: 1` $\rightarrow$ `active`): PASS
  - Sequential queue renumbering: PASS
  - *Result*: **9 passed in 11.3ms**

### 6.2 Latency & Resource Footprint
- **End-to-End Latency**: Edge sensor event $\rightarrow$ MQTT TLS $\rightarrow$ Bridge processing $\rightarrow$ Firestore update $\rightarrow$ Webapp React snapshot: **$< 450$ ms**.
- **Bandwidth Efficiency**: MQTT payload size $\approx 78$ bytes per event; transmission only occurs upon state transitions or heartbeats, minimizing network traffic.
- **Server Cost**: 100% Free Tier compatible (eliminates Google Cloud Functions Blaze billing requirement).

---

## 7. Conclusion & Future Enhancements

### 7.1 Key Contributions
1. Practical, zero-cost edge-to-cloud architecture for educational institutions.
2. Robust, automated recovery from power outages preventing desynchronized timers.
3. Strict server-authoritative fair-use queueing eliminating physical hostel disputes.

### 7.2 Future Scope
- **Smart Detergent Dispensing**: Integration of stepper-motor peristaltic pumps triggered upon cycle start.
- **RFID / NFC Student ID Card Tapping**: Physical tap-to-verify integration at laundry room entrance.
- **Floor-Wise Load Balancing**: Smart recommendations suggesting less busy laundry rooms across other hostel blocks.
