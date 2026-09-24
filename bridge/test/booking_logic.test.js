const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const DAILY_BOOKING_CAP = 2;
const DEFAULT_CYCLE_MINUTES = 30;

// Pure unit implementation of quota validation logic
function checkBookingQuota(userData, today) {
  const isSameDay = userData.lastBookingDate === today;
  const bookingCountToday = isSameDay ? (userData.dailyBookingCount || 0) : 0;
  if (bookingCountToday >= DAILY_BOOKING_CAP) {
    const error = new Error('Daily booking cap reached');
    error.statusCode = 429;
    throw error;
  }
  return {
    allowed: true,
    newCount: bookingCountToday + 1,
    date: today,
  };
}

// Pure unit implementation of booking assignment logic
function assignBookingSlot({ machineStatus, cycleDurationMinutes = DEFAULT_CYCLE_MINUTES, existingBookings, nowMs }) {
  const isFree = machineStatus === 'idle' || machineStatus === 'done';
  const activeDoc = existingBookings.find((b) => b.status === 'active');
  const queuedDocs = existingBookings.filter((b) => b.status === 'queued');

  if (isFree && !activeDoc && queuedDocs.length === 0) {
    return {
      status: 'active',
      queuePosition: 0,
      startedAtMs: nowMs,
      expectedEndAtMs: nowMs + cycleDurationMinutes * 60 * 1000,
      estimatedStartAtMs: null,
    };
  }

  const maxPos = queuedDocs.reduce((max, b) => Math.max(max, b.queuePosition || 0), 0);
  const queuePosition = maxPos + 1;

  let baseEndMs = nowMs;
  if (activeDoc && activeDoc.expectedEndAtMs) {
    baseEndMs = activeDoc.expectedEndAtMs;
  } else {
    baseEndMs = nowMs + cycleDurationMinutes * 60 * 1000;
  }

  const estStartMs = baseEndMs + (queuePosition - 1) * cycleDurationMinutes * 60 * 1000;
  return {
    status: 'queued',
    queuePosition,
    startedAtMs: null,
    expectedEndAtMs: null,
    estimatedStartAtMs: estStartMs,
  };
}

// Pure unit implementation of cancel & promotion logic
function cancelBookingLogic({ bookingToCancel, queuedBookings, cycleDurationMinutes = DEFAULT_CYCLE_MINUTES, nowMs }) {
  const wasActive = bookingToCancel.status === 'active';
  const remaining = queuedBookings
    .filter((b) => b.id !== bookingToCancel.id)
    .sort((a, b) => a.queuePosition - b.queuePosition);

  if (wasActive) {
    if (remaining.length === 0) {
      return { promotedBooking: null, renumberedQueue: [] };
    }

    const [next, ...others] = remaining;
    const promotedBooking = {
      ...next,
      status: 'active',
      queuePosition: 0,
      startedAtMs: nowMs,
      expectedEndAtMs: nowMs + cycleDurationMinutes * 60 * 1000,
      estimatedStartAtMs: null,
    };

    const renumberedQueue = others.map((b, idx) => ({
      ...b,
      queuePosition: idx + 1,
      estimatedStartAtMs: promotedBooking.expectedEndAtMs + idx * cycleDurationMinutes * 60 * 1000,
    }));

    return { promotedBooking, renumberedQueue };
  } else {
    // Queued was cancelled
    let baseEndMs = nowMs + cycleDurationMinutes * 60 * 1000;
    const renumberedQueue = remaining.map((b, idx) => ({
      ...b,
      queuePosition: idx + 1,
      estimatedStartAtMs: baseEndMs + idx * cycleDurationMinutes * 60 * 1000,
    }));

    return { promotedBooking: null, renumberedQueue };
  }
}

describe('DhobiDesk Bridge Booking Engine Tests', () => {
  describe('Daily Quota Verification', () => {
    const today = '2026-09-24';

    it('should allow 1st booking of the day', () => {
      const user = { dailyBookingCount: 0, lastBookingDate: today };
      const res = checkBookingQuota(user, today);
      assert.equal(res.allowed, true);
      assert.equal(res.newCount, 1);
    });

    it('should allow 2nd booking of the day', () => {
      const user = { dailyBookingCount: 1, lastBookingDate: today };
      const res = checkBookingQuota(user, today);
      assert.equal(res.allowed, true);
      assert.equal(res.newCount, 2);
    });

    it('should reject 3rd booking attempt with status 429', () => {
      const user = { dailyBookingCount: 2, lastBookingDate: today };
      assert.throws(() => checkBookingQuota(user, today), {
        name: 'Error',
        message: 'Daily booking cap reached',
        statusCode: 429,
      });
    });

    it('should reset quota automatically if last booking was on a previous day', () => {
      const user = { dailyBookingCount: 2, lastBookingDate: '2026-09-23' };
      const res = checkBookingQuota(user, today);
      assert.equal(res.allowed, true);
      assert.equal(res.newCount, 1);
    });
  });

  describe('Slot Assignment & Queue Positioning', () => {
    const nowMs = 1700000000000;

    it('should assign status: active and queuePosition: 0 when machine is idle with no queue', () => {
      const res = assignBookingSlot({
        machineStatus: 'idle',
        cycleDurationMinutes: 30,
        existingBookings: [],
        nowMs,
      });
      assert.equal(res.status, 'active');
      assert.equal(res.queuePosition, 0);
      assert.equal(res.startedAtMs, nowMs);
      assert.equal(res.expectedEndAtMs, nowMs + 30 * 60 * 1000);
      assert.equal(res.estimatedStartAtMs, null);
    });

    it('should assign status: queued and queuePosition: 1 when machine is washing', () => {
      const activeBooking = {
        id: 'b1',
        status: 'active',
        expectedEndAtMs: nowMs + 20 * 60 * 1000,
      };
      const res = assignBookingSlot({
        machineStatus: 'washing',
        cycleDurationMinutes: 30,
        existingBookings: [activeBooking],
        nowMs,
      });
      assert.equal(res.status, 'queued');
      assert.equal(res.queuePosition, 1);
      assert.equal(res.estimatedStartAtMs, activeBooking.expectedEndAtMs);
    });

    it('should assign incremental queue position to subsequent queued bookings', () => {
      const activeBooking = { id: 'b1', status: 'active', expectedEndAtMs: nowMs + 15 * 60 * 1000 };
      const queued1 = { id: 'b2', status: 'queued', queuePosition: 1 };
      const res = assignBookingSlot({
        machineStatus: 'washing',
        cycleDurationMinutes: 30,
        existingBookings: [activeBooking, queued1],
        nowMs,
      });
      assert.equal(res.status, 'queued');
      assert.equal(res.queuePosition, 2);
      assert.equal(res.estimatedStartAtMs, activeBooking.expectedEndAtMs + 30 * 60 * 1000);
    });
  });

  describe('Cancellation, Queue Renumbering & Turn Promotion', () => {
    const nowMs = 1700000000000;

    it('should promote queue #1 to active when active booking is cancelled', () => {
      const activeBooking = { id: 'b1', status: 'active' };
      const queuedBookings = [
        { id: 'b2', status: 'queued', queuePosition: 1, userId: 'user2' },
        { id: 'b3', status: 'queued', queuePosition: 2, userId: 'user3' },
      ];

      const { promotedBooking, renumberedQueue } = cancelBookingLogic({
        bookingToCancel: activeBooking,
        queuedBookings,
        cycleDurationMinutes: 30,
        nowMs,
      });

      assert.notEqual(promotedBooking, null);
      assert.equal(promotedBooking.id, 'b2');
      assert.equal(promotedBooking.status, 'active');
      assert.equal(promotedBooking.queuePosition, 0);

      // Remaining should be renumbered to queuePosition: 1
      assert.equal(renumberedQueue.length, 1);
      assert.equal(renumberedQueue[0].id, 'b3');
      assert.equal(renumberedQueue[0].queuePosition, 1);
      assert.equal(renumberedQueue[0].estimatedStartAtMs, promotedBooking.expectedEndAtMs);
    });

    it('should renumber queue when an intermediate queued booking is cancelled', () => {
      const activeBooking = { id: 'b1', status: 'active' };
      const queuedToCancel = { id: 'b3', status: 'queued', queuePosition: 2 };
      const queuedBookings = [
        { id: 'b2', status: 'queued', queuePosition: 1 },
        queuedToCancel,
        { id: 'b4', status: 'queued', queuePosition: 3 },
      ];

      const { promotedBooking, renumberedQueue } = cancelBookingLogic({
        bookingToCancel: queuedToCancel,
        queuedBookings,
        cycleDurationMinutes: 30,
        nowMs,
      });

      assert.equal(promotedBooking, null);
      assert.equal(renumberedQueue.length, 2);
      assert.equal(renumberedQueue[0].id, 'b2');
      assert.equal(renumberedQueue[0].queuePosition, 1);
      assert.equal(renumberedQueue[1].id, 'b4');
      assert.equal(renumberedQueue[1].queuePosition, 2);
    });
  });
});
