import ICAL from 'ical.js';

export interface ParsedAttendee {
  email: string;
  name: string | null;
  partstat: 'needs-action' | 'accepted' | 'declined' | 'tentative' | 'delegated';
}

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
  // Essential iCalendar fields for sync
  status: 'tentative' | 'confirmed' | 'cancelled';
  sequence: number;
  ical_uid: string;
  ical_timestamp: string | null;
  // Organizer and attendees
  organizer_email: string | null;
  organizer_name: string | null;
  attendees: ParsedAttendee[];
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

      // Get essential iCalendar fields for sync
      const statusProp = vevent.getFirstPropertyValue('status');
      const status = statusProp ? statusProp.toLowerCase() : 'confirmed';

      const sequence = vevent.getFirstPropertyValue('sequence') || 0;

      const dtstampProp = vevent.getFirstPropertyValue('dtstamp');
      const icalTimestamp = dtstampProp ? dtstampProp.toJSDate().toISOString() : null;

      // Extract organizer
      let organizerEmail: string | null = null;
      let organizerName: string | null = null;
      const organizerProp = vevent.getFirstProperty('organizer');
      if (organizerProp) {
        const organizerValue = organizerProp.getFirstValue();
        // Organizer value is typically "mailto:email@example.com"
        if (organizerValue && typeof organizerValue === 'string') {
          organizerEmail = organizerValue.replace('mailto:', '').toLowerCase();
        }
        // Get CN (Common Name) parameter
        const cnParam = organizerProp.getParameter('cn');
        if (cnParam) {
          organizerName = cnParam;
        }
      }

      // Extract attendees
      const attendees: ParsedAttendee[] = [];
      const attendeeProps = vevent.getAllProperties('attendee');
      for (const attendeeProp of attendeeProps) {
        const attendeeValue = attendeeProp.getFirstValue();
        if (attendeeValue && typeof attendeeValue === 'string') {
          const email = attendeeValue.replace('mailto:', '').toLowerCase();
          const name = attendeeProp.getParameter('cn') || null;
          const partstat = (attendeeProp.getParameter('partstat') || 'needs-action').toLowerCase();

          attendees.push({
            email,
            name,
            partstat: partstat as ParsedAttendee['partstat'],
          });
        }
      }

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
        etag: null,
        status: status as 'tentative' | 'confirmed' | 'cancelled',
        sequence,
        ical_uid: uid,
        ical_timestamp: icalTimestamp,
        organizer_email: organizerEmail,
        organizer_name: organizerName,
        attendees,
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

  // Add start/end times (support both camelCase and snake_case)
  const startTimeValue = event.startTime || event.start_time;
  const endTimeValue = event.endTime || event.end_time;
  const allDayValue = event.allDay !== undefined ? event.allDay : event.all_day;

  const startTime = ICAL.Time.fromJSDate(new Date(startTimeValue), allDayValue);
  const endTime = ICAL.Time.fromJSDate(new Date(endTimeValue), allDayValue);

  vevent.addPropertyWithValue('dtstart', startTime);
  vevent.addPropertyWithValue('dtend', endTime);

  // Add recurrence rule if present (support both camelCase and snake_case)
  const recurrenceRule = event.recurrenceRule || event.recurrence_rule;
  if (recurrenceRule) {
    vevent.addPropertyWithValue('rrule', ICAL.Recur.fromString(recurrenceRule));
  }

  // Add essential iCalendar fields for sync
  if (event.status) {
    vevent.addPropertyWithValue('status', event.status.toUpperCase());
  }

  if (event.sequence !== undefined && event.sequence !== null) {
    vevent.addPropertyWithValue('sequence', event.sequence);
  }

  // Add timestamps (support both camelCase and snake_case)
  const icalTimestamp = event.icalTimestamp || event.ical_timestamp;
  const dtstamp = icalTimestamp
    ? ICAL.Time.fromJSDate(new Date(icalTimestamp))
    : ICAL.Time.now();
  vevent.addPropertyWithValue('dtstamp', dtstamp);

  const createdAt = event.createdAt || event.created_at;
  if (createdAt) {
    vevent.addPropertyWithValue('created', ICAL.Time.fromJSDate(new Date(createdAt)));
  }

  const updatedAt = event.updatedAt || event.updated_at;
  if (updatedAt) {
    vevent.addPropertyWithValue('last-modified', ICAL.Time.fromJSDate(new Date(updatedAt)));
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
