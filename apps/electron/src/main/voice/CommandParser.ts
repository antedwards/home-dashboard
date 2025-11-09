import type { ParsedCommand, CommandIntent, EventParameters } from './types';

/**
 * Parses natural language transcripts into structured commands
 * Uses pattern matching and NLP techniques
 */
export class CommandParser {
  // Event creation patterns
  private readonly eventPatterns = [
    /(?:create|add|schedule|make|set up).*?(?:event|appointment|meeting)/i,
    /(?:remind me|reminder).*?(?:about|to|for)/i,
    /(?:put|add).*?(?:on|in|to).*?(?:calendar|schedule)/i,
  ];

  // Time patterns
  private readonly timePatterns = {
    // Specific times: "at 3pm", "at 3:30", "at 15:00"
    specificTime:
      /(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi,
    // Relative times: "tomorrow", "next monday"
    tomorrow: /\btomorrow\b/i,
    today: /\btoday\b/i,
    dayOfWeek:
      /\b(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    // Dates: "on March 15th", "on 3/15", "March 15"
    monthDay:
      /(?:on\s+)?(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
  };

  // Duration patterns: "for 1 hour", "for 30 minutes"
  private readonly durationPattern = /(?:for|lasting)\s+(\d+)\s*(hour|hours|minute|minutes|min|mins)/i;

  // Location patterns: "at home", "in the office"
  private readonly locationPattern = /(?:at|in|@)\s+([^,\.]+?)(?:\s+(?:at|on|for)|$)/i;

  /**
   * Parse a transcript into a structured command
   */
  parse(transcript: string): ParsedCommand {
    const normalized = transcript.toLowerCase().trim();

    // Determine intent
    const intent = this.detectIntent(normalized);

    // Extract parameters based on intent
    let parameters: Record<string, any> = {};
    let confidence = 0.5;

    switch (intent) {
      case 'CREATE_EVENT':
        parameters = this.parseEventParameters(transcript);
        confidence = this.calculateConfidence(parameters);
        break;
      case 'CREATE_REMINDER':
        parameters = this.parseReminderParameters(transcript);
        confidence = this.calculateConfidence(parameters);
        break;
      default:
        confidence = 0.1;
    }

    return {
      intent,
      confidence,
      parameters,
      rawTranscript: transcript,
    };
  }

  /**
   * Detect the command intent
   */
  private detectIntent(transcript: string): CommandIntent {
    // Check for event creation
    if (this.eventPatterns.some((pattern) => pattern.test(transcript))) {
      return 'CREATE_EVENT';
    }

    // Check for reminders
    if (/\b(?:remind|reminder)\b/i.test(transcript)) {
      return 'CREATE_REMINDER';
    }

    // Check for listing
    if (/\b(?:what|list|show|tell me).*?(?:events|appointments|schedule)\b/i.test(transcript)) {
      return 'LIST_EVENTS';
    }

    // Check for deletion
    if (/\b(?:delete|remove|cancel)\b.*?(?:event|appointment|meeting)\b/i.test(transcript)) {
      return 'DELETE_EVENT';
    }

    return 'UNKNOWN';
  }

  /**
   * Parse event parameters from transcript
   */
  private parseEventParameters(transcript: string): EventParameters {
    const params: EventParameters = {
      title: this.extractTitle(transcript),
    };

    // Extract date and time
    const dateTime = this.extractDateTime(transcript);
    if (dateTime.date) {
      params.date = dateTime.date;
    }
    if (dateTime.time) {
      params.time = dateTime.time;
    }

    // Extract duration
    const duration = this.extractDuration(transcript);
    if (duration) {
      params.duration = duration;
    }

    // Extract location
    const location = this.extractLocation(transcript);
    if (location) {
      params.location = location;
    }

    // Check if all-day event
    params.allDay = /\ball[- ]day\b/i.test(transcript);

    return params;
  }

  /**
   * Parse reminder parameters
   */
  private parseReminderParameters(transcript: string): any {
    return {
      title: this.extractTitle(transcript),
      time: this.extractDateTime(transcript).date || new Date(),
    };
  }

  /**
   * Extract event title from transcript
   */
  private extractTitle(transcript: string): string {
    // Remove common command phrases
    let title = transcript
      .replace(/^(?:hey sausage|okay|ok|please)\s+/i, '')
      .replace(/(?:create|add|schedule|make|set up)\s+(?:an?\s+)?(?:event|appointment|meeting)\s+(?:for|called|named|titled)?\s*/i, '')
      .replace(/(?:remind me|reminder)\s+(?:to|about|for)\s*/i, '')
      .replace(this.timePatterns.specificTime, '')
      .replace(this.durationPattern, '')
      .replace(/\b(?:tomorrow|today|next week|this week)\b/gi, '')
      .replace(/\b(?:at|in|on)\s+[\w\s]+(?=\s|$)/gi, '')
      .trim();

    // Clean up extra spaces
    title = title.replace(/\s+/g, ' ').trim();

    // Capitalize first letter
    if (title) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title || 'Untitled Event';
  }

  /**
   * Extract date and time
   */
  private extractDateTime(transcript: string): {
    date?: Date;
    time?: { hour: number; minute: number };
  } {
    const now = new Date();
    let targetDate = new Date(now);
    let targetTime: { hour: number; minute: number } | undefined;

    // Check for "tomorrow"
    if (this.timePatterns.tomorrow.test(transcript)) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Check for "today"
    if (this.timePatterns.today.test(transcript)) {
      // targetDate is already today
    }

    // Check for day of week
    const dayMatch = this.timePatterns.dayOfWeek.exec(transcript);
    if (dayMatch) {
      const dayName = dayMatch[2].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayName);
      const currentDay = targetDate.getDay();

      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0 || dayMatch[1]?.toLowerCase() === 'next') {
        daysToAdd += 7;
      }
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }

    // Extract specific time
    const timeMatch = this.timePatterns.specificTime.exec(transcript);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      // Convert to 24-hour format
      if (meridiem?.includes('pm') && hour !== 12) {
        hour += 12;
      } else if (meridiem?.includes('am') && hour === 12) {
        hour = 0;
      }

      targetTime = { hour, minute };
      targetDate.setHours(hour, minute, 0, 0);
    }

    return {
      date: targetDate,
      time: targetTime,
    };
  }

  /**
   * Extract duration in minutes
   */
  private extractDuration(transcript: string): number | undefined {
    const match = this.durationPattern.exec(transcript);
    if (!match) return undefined;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('hour')) {
      return value * 60;
    } else {
      return value;
    }
  }

  /**
   * Extract location
   */
  private extractLocation(transcript: string): string | undefined {
    // Look for "at/in [location]" patterns
    const patterns = [
      /\b(?:at|in)\s+([\w\s]+?)(?:\s+(?:tomorrow|today|on|at \d|$))/i,
      /\blocation:?\s+([\w\s]+?)(?:\s+(?:tomorrow|today|on|at \d|$))/i,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(transcript);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Calculate confidence score based on extracted parameters
   */
  private calculateConfidence(parameters: Record<string, any>): number {
    let score = 0.5;

    if (parameters.title && parameters.title !== 'Untitled Event') {
      score += 0.2;
    }
    if (parameters.date) {
      score += 0.15;
    }
    if (parameters.time) {
      score += 0.1;
    }
    if (parameters.duration || parameters.location) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }
}
