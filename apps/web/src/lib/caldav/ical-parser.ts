import ICAL from 'ical.js';

export interface ParsedEvent {
  external_uid: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  recurrence_rule: string | null;
  external_calendar: string;
  external_url: string;
  etag: string | null;
  // iCalendar-specific fields
  status: 'tentative' | 'confirmed' | 'cancelled';
  sequence: number;
  transparency: 'opaque' | 'transparent';
  priority: number;
  classification: 'public' | 'private' | 'confidential';
  organizer: string | null;
  ical_uid: string;
  ical_timestamp: string | null;
}

/**
 * Parse iCalendar (ICS) data into events
 */
export function parseICalendarData(icsData: string, calendarName: string, calendarUrl: string): ParsedEvent[] {
  try {
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events: ParsedEvent[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // Get UID (required)
      const uid = event.uid;
      if (!uid) continue;

      // Get basic properties
      const summary = event.summary || 'Untitled Event';
      const description = event.description || null;
      const location = event.location || null;

      // Get times
      const startDate = event.startDate;
      const endDate = event.endDate;

      if (!startDate || !endDate) continue;

      // Check if all-day event
      const isAllDay = startDate.isDate; // ICAL.Time has isDate property for all-day events

      // Convert to ISO strings
      const startTime = startDate.toJSDate().toISOString();
      const endTime = endDate.toJSDate().toISOString();

      // Get recurrence rule (RRULE)
      let rrule: string | null = null;
      const recurrenceProperty = vevent.getFirstProperty('rrule');
      if (recurrenceProperty) {
        rrule = recurrenceProperty.toICALString(); // e.g., "FREQ=WEEKLY;BYDAY=MO,WE,FR"
      }

      // Get STATUS field (tentative, confirmed, cancelled)
      const statusProp = vevent.getFirstPropertyValue('status');
      const status = statusProp ? statusProp.toLowerCase() : 'confirmed';

      // Get SEQUENCE field (version number)
      const sequence = vevent.getFirstPropertyValue('sequence') || 0;

      // Get TRANSP field (transparency - opaque=busy, transparent=free)
      const transpProp = vevent.getFirstPropertyValue('transp');
      const transparency = transpProp === 'TRANSPARENT' ? 'transparent' : 'opaque';

      // Get PRIORITY field (0-9)
      const priority = vevent.getFirstPropertyValue('priority') || 0;

      // Get CLASS field (access classification)
      const classProp = vevent.getFirstPropertyValue('class');
      const classification = classProp ? classProp.toLowerCase() : 'public';

      // Get ORGANIZER field
      const organizerProp = vevent.getFirstProperty('organizer');
      const organizer = organizerProp ? organizerProp.getFirstValue() : null;

      // Get DTSTAMP field (last modification timestamp)
      const dtstampProp = vevent.getFirstPropertyValue('dtstamp');
      const icalTimestamp = dtstampProp ? dtstampProp.toJSDate().toISOString() : null;

      events.push({
        external_uid: uid,
        title: summary,
        description,
        start_time: startTime,
        end_time: endTime,
        all_day: isAllDay,
        location,
        recurrence_rule: rrule,
        external_calendar: calendarName,
        external_url: calendarUrl,
        etag: null, // ETag comes from HTTP headers, not iCal data
        // iCalendar-specific fields
        status: status as 'tentative' | 'confirmed' | 'cancelled',
        sequence,
        transparency: transparency as 'opaque' | 'transparent',
        priority: Math.max(0, Math.min(9, priority)), // Clamp to 0-9
        classification: classification as 'public' | 'private' | 'confidential',
        organizer,
        ical_uid: uid,
        ical_timestamp: icalTimestamp,
      });
    }

    return events;
  } catch (error) {
    console.error('[iCal Parser] Failed to parse iCalendar data:', error);
    throw new Error(`Failed to parse calendar data: ${error}`);
  }
}

/**
 * Convert database event to iCalendar format for pushing to CalDAV
 */
export function eventToICalendar(event: any): string {
  const comp = new ICAL.Component(['vcalendar', [], []]);

  // Add calendar properties
  comp.addPropertyWithValue('version', '2.0');
  comp.addPropertyWithValue('prodid', '-//Home Dashboard//Calendar Sync//EN');

  // Create event component
  const vevent = new ICAL.Component('vevent');

  // Add UID (use ical_uid if available, otherwise external_uid or id)
  vevent.addPropertyWithValue('uid', event.ical_uid || event.external_uid || event.id);

  // Add summary (title)
  vevent.addPropertyWithValue('summary', event.title || 'Untitled Event');

  // Add description
  if (event.description) {
    vevent.addPropertyWithValue('description', event.description);
  }

  // Add location
  if (event.location) {
    vevent.addPropertyWithValue('location', event.location);
  }

  // Add start/end times
  const startTime = ICAL.Time.fromJSDate(new Date(event.start_time), event.all_day);
  const endTime = ICAL.Time.fromJSDate(new Date(event.end_time), event.all_day);

  vevent.addPropertyWithValue('dtstart', startTime);
  vevent.addPropertyWithValue('dtend', endTime);

  // Add recurrence rule if present
  if (event.recurrence_rule) {
    vevent.addPropertyWithValue('rrule', ICAL.Recur.fromString(event.recurrence_rule));
  }

  // Add iCalendar-specific fields
  if (event.status) {
    vevent.addPropertyWithValue('status', event.status.toUpperCase());
  }

  if (event.sequence !== undefined && event.sequence !== null) {
    vevent.addPropertyWithValue('sequence', event.sequence);
  }

  if (event.transparency) {
    vevent.addPropertyWithValue('transp', event.transparency.toUpperCase());
  }

  if (event.priority !== undefined && event.priority !== null && event.priority !== 0) {
    vevent.addPropertyWithValue('priority', event.priority);
  }

  if (event.classification) {
    vevent.addPropertyWithValue('class', event.classification.toUpperCase());
  }

  if (event.organizer) {
    vevent.addPropertyWithValue('organizer', event.organizer);
  }

  // Add timestamps
  const dtstamp = event.ical_timestamp
    ? ICAL.Time.fromJSDate(new Date(event.ical_timestamp))
    : ICAL.Time.now();
  vevent.addPropertyWithValue('dtstamp', dtstamp);

  if (event.created_at) {
    vevent.addPropertyWithValue('created', ICAL.Time.fromJSDate(new Date(event.created_at)));
  }

  if (event.updated_at) {
    vevent.addPropertyWithValue('last-modified', ICAL.Time.fromJSDate(new Date(event.updated_at)));
  }

  // Add event to calendar
  comp.addSubcomponent(vevent);

  // Convert to string
  return comp.toString();
}

/**
 * Generate UID for new event
 */
export function generateEventUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2)}@home-dashboard`;
}
