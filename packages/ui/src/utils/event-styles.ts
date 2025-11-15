/**
 * Generate background color for calendar events
 * Uses the event's category color with low opacity for a tinted effect
 */
export function getEventBackgroundColor(color?: string | null): string {
  if (!color) {
    return 'rgba(59, 130, 246, 0.08)'; // Default blue with 8% opacity
  }
  // Append hex opacity (15 = ~8% opacity) to the color
  return `${color}15`;
}

/**
 * Generate border color for calendar events
 */
export function getEventBorderColor(color?: string | null): string {
  return color || '#3b82f6';
}

/**
 * Generate complete inline styles for an event block
 */
export function getEventStyles(color?: string | null, additionalStyles: Record<string, string | number> = {}): string {
  const baseStyles = {
    'border-left-color': getEventBorderColor(color),
    'background-color': getEventBackgroundColor(color),
    ...additionalStyles,
  };

  return Object.entries(baseStyles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}
