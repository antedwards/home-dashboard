// Calendar utility functions

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  dayOfMonth: number;
  dayOfWeek: number;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  monthName: string;
  weeks: CalendarWeek[];
  daysInMonth: number;
}

/**
 * Get the number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the first day of the month (0 = Sunday, 6 = Saturday)
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get ISO week number
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Generate calendar grid for a month
 */
export function generateCalendarMonth(year: number, month: number): CalendarMonth {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarDay[] = [];

  // Add previous month's days to fill the first week
  const previousMonth = month === 0 ? 11 : month - 1;
  const previousYear = month === 0 ? year - 1 : year;
  const daysInPreviousMonth = getDaysInMonth(previousYear, previousMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPreviousMonth - i;
    const date = new Date(previousYear, previousMonth, day);
    currentWeek.push({
      date,
      isToday: isSameDay(date, today),
      isCurrentMonth: false,
      dayOfMonth: day,
      dayOfWeek: date.getDay(),
    });
  }

  // Add current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    currentWeek.push({
      date,
      isToday: isSameDay(date, today),
      isCurrentMonth: true,
      dayOfMonth: day,
      dayOfWeek: date.getDay(),
    });

    // Start a new week on Sunday
    if (date.getDay() === 6 || day === daysInMonth) {
      weeks.push({
        weekNumber: getWeekNumber(date),
        days: [...currentWeek],
      });
      currentWeek = [];
    }
  }

  // Add next month's days to fill the last week
  if (currentWeek.length > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    let day = 1;

    while (currentWeek.length < 7) {
      const date = new Date(nextYear, nextMonth, day);
      currentWeek.push({
        date,
        isToday: isSameDay(date, today),
        isCurrentMonth: false,
        dayOfMonth: day,
        dayOfWeek: date.getDay(),
      });
      day++;
    }

    weeks.push({
      weekNumber: getWeekNumber(currentWeek[0].date),
      days: currentWeek,
    });
  }

  return {
    year,
    month,
    monthName: monthNames[month],
    weeks,
    daysInMonth,
  };
}

/**
 * Get the current week (Sunday - Saturday)
 */
export function getCurrentWeek(date: Date = new Date()): CalendarDay[] {
  const dayOfWeek = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - dayOfWeek);

  const week: CalendarDay[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const current = new Date(sunday);
    current.setDate(sunday.getDate() + i);
    week.push({
      date: current,
      isToday: isSameDay(current, today),
      isCurrentMonth: current.getMonth() === date.getMonth(),
      dayOfMonth: current.getDate(),
      dayOfWeek: current.getDay(),
    });
  }

  return week;
}

/**
 * Get hours of the day for time-grid views
 */
export function getHoursOfDay(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

/**
 * Format time as 12-hour format
 */
export function formatTime12Hour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/**
 * Format time as 24-hour format
 */
export function formatTime24Hour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Get day name
 */
export function getDayName(dayOfWeek: number, short: boolean = false): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return short ? shortDays[dayOfWeek] : days[dayOfWeek];
}

/**
 * Format date as string
 */
export function formatDate(
  date: Date,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  switch (format) {
    case 'short':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'medium':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
  }
}

/**
 * Calculate event position in time grid
 */
export function calculateEventPosition(startTime: Date, endTime: Date): {
  top: number;
  height: number;
} {
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  const duration = endMinutes - startMinutes;

  // Assuming each hour is 60px tall
  const pixelsPerMinute = 60 / 60; // 1px per minute

  return {
    top: startMinutes * pixelsPerMinute,
    height: duration * pixelsPerMinute,
  };
}
