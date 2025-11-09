import type { ActionHandler, ParsedCommand, ActionContext, ActionResult } from '../types';

/**
 * Registry for voice command action handlers
 * Provides extensibility for adding new command types
 */
export class ActionRegistry {
  private handlers: Map<string, ActionHandler> = new Map();

  /**
   * Register a new action handler
   */
  register(handler: ActionHandler): void {
    if (this.handlers.has(handler.name)) {
      console.warn(`Handler with name "${handler.name}" already registered. Overwriting.`);
    }
    this.handlers.set(handler.name, handler);
    console.log(`Registered action handler: ${handler.name}`);
  }

  /**
   * Unregister an action handler
   */
  unregister(handlerName: string): boolean {
    return this.handlers.delete(handlerName);
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): ActionHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Find the best handler for a command
   */
  findHandler(command: ParsedCommand): ActionHandler | null {
    // Find all handlers that can handle this command
    const candidates = Array.from(this.handlers.values()).filter((handler) =>
      handler.canHandle(command)
    );

    if (candidates.length === 0) {
      return null;
    }

    // Return the first matching handler
    // In future, could implement priority or confidence scoring
    return candidates[0];
  }

  /**
   * Execute a command using the appropriate handler
   */
  async executeCommand(
    command: ParsedCommand,
    context: ActionContext
  ): Promise<ActionResult> {
    const handler = this.findHandler(command);

    if (!handler) {
      return {
        success: false,
        message: "I didn't understand that command.",
        error: `No handler found for intent: ${command.intent}`,
      };
    }

    try {
      return await handler.execute(command, context);
    } catch (error: any) {
      console.error(`Error executing command with handler ${handler.name}:`, error);
      return {
        success: false,
        message: 'Sorry, something went wrong.',
        error: error.message,
      };
    }
  }
}
