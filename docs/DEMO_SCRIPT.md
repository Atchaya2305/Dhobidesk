# DhobiDesk — Final Year Viva Demonstration Script

This document provides a structured, chronological walkthrough for presenting and demonstrating the DhobiDesk system to project examiners, evaluators, and viva panels.

---

## 📋 Pre-Demo Preparation Checklist

Before the examiners arrive, ensure the following are prepared:
- [ ] **3 Terminal Windows Open**:
  - Terminal 1: `bridge/`
  - Terminal 2: `webapp/`
  - Terminal 3: `simulation/`
- [ ] **Browser Tabs Ready**:
  - Tab 1: DhobiDesk Web Application (`http://localhost:5173`)
  - Tab 2: Firebase Console > Firestore Database (`dhobidesk-jass-fyp`)
  - Tab 3: HiveMQ Cloud Web Console (optional, to showcase live MQTT broker messages)
- [ ] **Notification Permissions**: Browser notification permission granted for `localhost:5173`.

---

## 🎬 Demonstration Walkthrough

### **Act 1: System Boot & Architecture Overview (1–2 mins)**

**Talking Points:**
> *"DhobiDesk addresses common hostel and campus laundry problems: students making unnecessary trips to laundry rooms, clothes left forgotten in idle machines, long unmanaged queues, and power cuts corrupting cycle states. Our stack connects edge sensors to HiveMQ Cloud via MQTT, processed by a lightweight Node.js Express bridge, stored in Firestore, and delivered to students through a real-time React web application."*

1. **Terminal 1 — Start the Bridge Backend**:
   ```powershell
   cd bridge
   node index.js
   ```
   *Point out output:* `Connected to HiveMQ`, `Local booking API listening on http://localhost:3001`, and `Synced machine queue info`.

2. **Terminal 2 — Start the Webapp**:
   ```powershell
   cd webapp
   npm run dev
   ```
   *Open browser:* Navigate to `http://localhost:5173`. Show the clean login screen and log in with student credentials.

---

### **Act 2: Live Machine Telemetry & Real-Time Availability (2 mins)**

**Talking Points:**
> *"Instead of polling or requiring expensive cloud infrastructure, telemetry is streamed through HiveMQ Cloud over TLS. Our classification engine derives whether the machine is idle, washing, or spinning using accelerometer variance and current consumption."*

1. **Terminal 3 — Run Simulator**:
   ```powershell
   cd simulation
   venv\Scripts\python.exe simulator_cli.py -n 2 --speedup 5.0
   ```
2. **Observe in Web App**:
   - `machine_01` and `machine_02` appear in the **Machine Status & Availability** section.
   - Status badge shows `IDLE` with vibrant green **`Available now`** wait estimate and a green **`Book My Slot`** button.

---

### **Act 3: Instant Slot Booking & Live Countdown (2 mins)**

**Talking Points:**
> *"When a machine is idle, booking immediately converts to an active wash cycle with a live, real-time countdown timer synchronized with Firestore."*

1. **In the Web App**:
   - Click **`Book My Slot`** on `machine_01`.
   - Show the green success toast: *"Your wash cycle on machine_01 has started!"*
   - Scroll up to **My Reservations**: Show the prominent blue **Active Wash** card with live countdown (`29:58`, `29:57`...).
   - Point out: `Expected Completion: [Exact Time]`.
2. **On the Machine Card**:
   - `machine_01` wait estimate immediately switches to: `In cycle • ~30m wait`.
   - Button label dynamically changes to **`Book Slot (Join Queue)`**.

---

### **Act 4: Dynamic Queueing & Wait Estimation (2 mins)**

**Talking Points:**
> *"If another student wishes to wash clothes while the machine is busy, DhobiDesk places them in a sequential FIFO queue and dynamically projects their estimated start time."*

1. **In the Web App**:
   - Click **`Book Slot (Join Queue)`** on `machine_01`.
   - Show the toast: *"Added to queue (#1) for machine_01."*
   - Under **My Reservations**, show the new **Queued Reservations** section:
     - Card: `machine_01` with badge `Queue #1`.
     - Displays projected start time: `Est. Start: [Exact Time]` (matching the active wash completion time).
2. **Enforce Daily Cap**:
   - Click **`Book Slot (Join Queue)`** once more.
   - Show the error toast: *"Booking Failed: Daily booking cap reached"*.
   - *Explanation to examiners:* *"To prevent hoarding, our backend transaction strictly caps each student to 2 bookings per day."*

---

### **Act 5: Fault Injection — Power Cut & Dynamic Recovery (3 mins) [KEY HIGHLIGHT]**

**Talking Points:**
> *"Unscheduled power cuts frequently interrupt hostel washing machines. Traditional timers lose synchronization and report finished cycles prematurely. DhobiDesk detects power cuts, freezes cycle runtime, and shifts completion times forward dynamically."*

1. **Terminal 3 — Inject Power Cut**:
   Stop the current simulation (`Ctrl+C`), and run with the fault flag:
   ```powershell
   venv\Scripts\python.exe simulator_cli.py --machine-id machine_01 --speedup 5.0 --fault power_cut
   ```
2. **Observe in Web App**:
   - When the power cut occurs, point out:
     - Active Wash card turns **RED**!
     - Displays `⏸ PAUSED`.
     - Banner appears: *"Power lost on machine. Cycle is paused and will automatically resume once power returns."*
     - Countdown timer freezes.
     - Machine card switches to `OFFLINE`.
3. **Power Restoration & Automatic Shift**:
   - After 10 seconds, the simulator restores power and resumes the cycle.
   - Point out in Web App:
     - Card returns to **BLUE**.
     - `⚡ Completion time shifted due to power cut recovery` badge appears.
     - Expected Completion time has shifted forward by the exact duration of the power cut.
     - Downstream queued bookings automatically shift their estimated start times forward in sync!

---

### **Act 6: Web Push Notifications & Laundry Collection (2 mins)**

**Talking Points:**
> *"When a cycle finishes, our bridge sends a real-time FCM push alert to the student's device so they can immediately pick up their clothes."*

1. **Observe Cycle Completion**:
   - The simulator transmits `done`.
   - The active wash completes.
   - A system push notification arrives: *"Your laundry is done! Please collect it soon."*
2. **Collect Laundry Action**:
   - In **My Reservations**, the green **Ready for Pickup** card appears: *"Laundry Ready for Pickup: machine_01"*.
   - Click **`✓ I've Collected`**.
   - Show the success toast: *"Marked as collected from machine_01. Thank you!"*.
   - The machine is freed and the booking moves into **Booking History** with status `collected`.

---

### **Act 7: Cancellation & Turn Promotion (2 mins)**

**Talking Points:**
> *"If an active or queued user cancels their reservation, DhobiDesk atomically promotes the next student in line and re-numbers the queue without human intervention."*

1. **In the Web App**:
   - Create a booking to start an active wash, and create a second booking into the queue (`Queue #1`).
   - On the Active Wash card, click **`Cancel Reservation`** and confirm the dialog.
   - Instantly show:
     - The previous active wash is cancelled.
     - The queued booking is **automatically promoted to Active Wash**, position resets to 0, and a 30-minute cycle countdown begins for the next user.
     - An FCM alert is triggered: *"Machine is free — It is now your turn."*

---

### **Act 8: Automated Verification Tests (1 min)**

**Talking Points:**
> *"All algorithms and state transitions are covered by automated unit test suites."*

1. **Run Python Tests (7 tests)**:
   ```powershell
   simulation\venv\Scripts\pytest.exe simulation/tests
   ```
   *Highlight:* Threshold derivation, rolling variance calculation, stream debounce filter, and power-loss recovery tests passing in ~1 second.

2. **Run Node.js Booking Engine Tests (9 tests)**:
   ```powershell
   cd bridge
   npm test
   ```
   *Highlight:* Daily quota cap, queue FIFO ordering, turn promotion, and dynamic timing math verified in ~15 milliseconds.

---

## 🏆 Summary Checklist for Questions / Defense

- **Q: Why didn't you use Firebase Cloud Functions?**
  *A: Cloud Functions requires the Firebase Blaze plan (paid credit card tier). Our Node.js Express bridge provides identical server-authoritative security, atomic Firestore transactions, and background cron capabilities completely free.*
- **Q: How does the system distinguish washing from spinning without internet access?**
  *A: The edge classification uses rolling variance on 3-axis accelerometer magnitude. Spinning generates continuous high-frequency vibration exceeding calibrated thresholds, whereas washing generates intermittent lower-variance sloshing.*
- **Q: How does DhobiDesk prevent race conditions in queue assignment?**
  *A: All bookings and cancellations run through `db.runTransaction()`, an atomic ACID transaction in Cloud Firestore ensuring no two users can claim the same slot or exceed daily limits.*
