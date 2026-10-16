/**
 * Store Timing & Online Status Synchronization Utilities
 * 
 * Accurately parses store operating hours (open_time / close_time),
 * checks against local real-time clock, and accounts for manual seller override (is_online).
 */

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  
  // Format: 12-hour with AM/PM e.g. "8:00 AM" or "10:30 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Format: 24-hour e.g. "08:00:00", "08:00", "22:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return null;
}

export function formatMinutesTo12Hour(minutes) {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${meridiem}`;
}

export function formatTimeForDisplay(timeStr, fallback = '08:00 AM') {
  const min = parseTimeToMinutes(timeStr);
  if (min == null) return fallback;
  return formatMinutesTo12Hour(min);
}

/**
 * Evaluates whether current time falls within operating hours.
 * Supports standard hours (e.g. 08:00 - 22:00) and overnight hours (e.g. 20:00 - 04:00).
 */
export function isWithinOperatingHours(openTimeStr, closeTimeStr, date = new Date()) {
  const openMin = parseTimeToMinutes(openTimeStr) ?? (8 * 60);
  const closeMin = parseTimeToMinutes(closeTimeStr) ?? (22 * 60);
  const currentMin = date.getHours() * 60 + date.getMinutes();

  if (openMin === closeMin) {
    // 24 hours open
    return true;
  }

  if (openMin < closeMin) {
    // Regular daytime schedule
    return currentMin >= openMin && currentMin < closeMin;
  }

  // Overnight schedule spanning midnight (e.g. 20:00 to 04:00)
  return currentMin >= openMin || currentMin < closeMin;
}

/**
 * Returns complete store status info synced with actual shop timings and manual toggle
 */
export function getStoreTimingStatus(store, date = new Date()) {
  const openRaw = store?.open_time || '08:00:00';
  const closeRaw = store?.close_time || '22:00:00';

  const openMin = parseTimeToMinutes(openRaw) ?? (8 * 60);
  const closeMin = parseTimeToMinutes(closeRaw) ?? (22 * 60);

  const openTimeFormatted = formatMinutesTo12Hour(openMin);
  const closeTimeFormatted = formatMinutesTo12Hour(closeMin);

  const withinHours = isWithinOperatingHours(openRaw, closeRaw, date);
  const isManuallyClosed = store?.is_online === false;

  // Effective status:
  // If the merchant manually turned off the store, it's CLOSED regardless of schedule.
  if (isManuallyClosed) {
    return {
      isOpen: false,
      isWithinHours: withinHours,
      isManuallyClosed: true,
      openTimeStr: openTimeFormatted,
      closeTimeStr: closeTimeFormatted,
      rawOpenTime: openRaw,
      rawCloseTime: closeRaw,
      statusLabel: 'Store: Closed',
      reason: 'manual_closed',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
      dotClass: 'bg-rose-500',
      tooltip: `Store manually paused • Hours: ${openTimeFormatted} - ${closeTimeFormatted} (Click to open)`,
      actionPrompt: 'Click to Open Store'
    };
  }

  // If online, check actual schedule
  if (!withinHours) {
    return {
      isOpen: false,
      isWithinHours: false,
      isManuallyClosed: false,
      openTimeStr: openTimeFormatted,
      closeTimeStr: closeTimeFormatted,
      rawOpenTime: openRaw,
      rawCloseTime: closeRaw,
      statusLabel: 'Store: Closed',
      reason: 'outside_hours',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100',
      dotClass: 'bg-amber-500',
      tooltip: `Closed outside operating hours (${openTimeFormatted} - ${closeTimeFormatted}) • Opens at ${openTimeFormatted} (Click to toggle)`,
      actionPrompt: 'Click to Override & Open'
    };
  }

  // Currently open and within operating hours
  return {
    isOpen: true,
    isWithinHours: true,
    isManuallyClosed: false,
    openTimeStr: openTimeFormatted,
    closeTimeStr: closeTimeFormatted,
    rawOpenTime: openRaw,
    rawCloseTime: closeRaw,
    statusLabel: 'Store: Open',
    reason: 'open_scheduled',
    badgeClass: 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100',
    dotClass: 'bg-green-500 animate-pulse',
    tooltip: `Store is Open • Operating Hours: ${openTimeFormatted} - ${closeTimeFormatted} • Closes at ${closeTimeFormatted} (Click to close)`,
    actionPrompt: 'Click to Close Store'
  };
}
