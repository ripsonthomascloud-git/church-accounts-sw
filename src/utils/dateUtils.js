/**
 * Date utility functions for handling Firestore Timestamps and Date objects
 */

/**
 * Convert Firestore Timestamp or Date to JavaScript Date
 * @param {*} value - Firestore Timestamp, Date, or string
 * @returns {Date|null} - JavaScript Date object or null
 */
export const toDate = (value) => {
  if (!value) return null;

  // Handle Firestore Timestamp objects
  if (typeof value === 'object' && value.toDate) {
    return value.toDate();
  }

  // Handle JavaScript Date objects
  if (value instanceof Date) {
    return value;
  }

  // Handle string dates
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      return null;
    }
  }

  return null;
};

/**
 * Format date for display
 * @param {*} value - Firestore Timestamp, Date, or string
 * @param {string} format - 'long' or 'short'
 * @returns {string} - Formatted date string
 */
export const formatDate = (value, format = 'long') => {
  const date = toDate(value);
  if (!date) return '—';

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return date.toLocaleDateString('en-US');
};

/**
 * Format date for HTML date input (YYYY-MM-DD)
 * @param {*} value - Firestore Timestamp, Date, or string
 * @returns {string} - Date in YYYY-MM-DD format
 */
export const toInputDate = (value) => {
  const date = toDate(value);
  if (!date) return '';

  return date.toISOString().split('T')[0];
};

/**
 * Format date of birth (MM-DD format)
 * @param {string} dob - Date of birth in MM-DD format
 * @returns {string} - Formatted date string (e.g., "January 15")
 */
export const formatDateOfBirth = (dob) => {
  if (!dob || typeof dob !== 'string') return '—';

  const parts = dob.split('-');
  if (parts.length !== 2) return '—';

  const [month, day] = parts;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return '—';

  const dayNum = parseInt(day, 10);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) return '—';

  return `${monthNames[monthIndex]} ${dayNum}`;
};
