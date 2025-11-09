import type {
  ActionHandler,
  ParsedCommand,
  ActionContext,
  ActionResult,
  CommandIntent,
  EventParameters,
} from '../types';
import { createSupabaseClient, createEvent } from '@home-dashboard/database';

/**
 * Handles calendar-related voice commands
 */
export class CalendarAction implements ActionHandler {
  readonly name = 'CalendarAction';
  readonly intents: CommandIntent[] = ['CREATE_EVENT'];

  private supabase = createSupabaseClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );

  canHandle(command: ParsedCommand): boolean {
    return this.intents.includes(command.intent);
  }

  async execute(command: ParsedCommand, context: ActionContext): Promise<ActionResult> {
    switch (command.intent) {
      case 'CREATE_EVENT':
        return this.createEvent(command.parameters as EventParameters, context);
      default:
        return {
          success: false,
          message: "I don't know how to do that yet.",
          error: `Unhandled intent: ${command.intent}`,
        };
    }
  }

  /**
   * Create a calendar event
   */
  private async createEvent(
    params: EventParameters,
    context: ActionContext
  ): Promise<ActionResult> {
    try {
      // Calculate start and end times
      const startTime = this.calculateStartTime(params);
      const endTime = this.calculateEndTime(params, startTime);

      // Create the event in Supabase
      const event = await createEvent(this.supabase, {
        family_id: context.familyId,
        user_id: context.userId,
        title: params.title,
        description: params.description,
        start_time: startTime,
        end_time: endTime,
        all_day: params.allDay || false,
        location: params.location,
        color: '#667eea', // Default color
        category: 'general',
      });

      // Format success message
      const message = this.formatSuccessMessage(params, startTime);

      return {
        success: true,
        message,
        data: event,
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      return {
        success: false,
        message: 'Sorry, I couldn\'t create that event.',
        error: error.message,
      };
    }
  }

  /**
   * Calculate event start time
   */
  private calculateStartTime(params: EventParameters): Date {
    const date = params.date || new Date();

    if (params.time) {
      date.setHours(params.time.hour, params.time.minute, 0, 0);
    } else if (!params.allDay) {
      // Default to next hour if no time specified
      const now = new Date();
      date.setHours(now.getHours() + 1, 0, 0, 0);
    }

    return date;
  }

  /**
   * Calculate event end time
   */
  private calculateEndTime(params: EventParameters, startTime: Date): Date {
    const endTime = new Date(startTime);

    if (params.endTime) {
      endTime.setHours(params.endTime.hour, params.endTime.minute, 0, 0);
    } else if (params.duration) {
      endTime.setMinutes(endTime.getMinutes() + params.duration);
    } else if (params.allDay) {
      endTime.setHours(23, 59, 59, 999);
    } else {
      // Default to 1 hour duration
      endTime.setHours(endTime.getHours() + 1);
    }

    return endTime;
  }

  /**
   * Format success message
   */
  private formatSuccessMessage(params: EventParameters, startTime: Date): string {
    const title = params.title;
    const dateStr = startTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    if (params.allDay) {
      return `Created all-day event "${title}" on ${dateStr}.`;
    }

    const timeStr = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (params.location) {
      return `Created "${title}" at ${params.location} on ${dateStr} at ${timeStr}.`;
    }

    return `Created "${title}" on ${dateStr} at ${timeStr}.`;
  }
}
