/**
 * Calculate the last record reset date (previous Sunday at 6PM UTC)
 * High frequency period starts Sunday 6PM UTC, so that's when records reset
 */
export function getLastRecordResetDate() {
  const now = new Date();
  const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getUTCHours();
  
  // Calculate days to subtract to get to the most recent Sunday 6PM UTC
  let daysToSubtract;
  
  if (currentDay === 0) { // Sunday
    if (currentHour >= 18) { // 6PM or later today
      daysToSubtract = 0; // Use today
    } else {
      daysToSubtract = 7; // Use last Sunday
    }
  } else {
    daysToSubtract = currentDay; // Days since last Sunday
  }
  
  const lastReset = new Date(now);
  lastReset.setUTCDate(now.getUTCDate() - daysToSubtract);
  lastReset.setUTCHours(18, 0, 0, 0); // Set to 6PM UTC
  
  return lastReset;
}

/**
 * Parse date string in DD.MM.YY format to a proper Date object
 */
function parseDateString(dateString) {
  if (!dateString) return null;
  
  // Handle DD.MM.YY format (e.g., "21.06.25")
  const parts = dateString.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-based
    let year = parseInt(parts[2], 10);
    
    // Convert 2-digit year to 4-digit year
    // Assume years 00-50 are 2000-2050, years 51-99 are 1951-1999
    if (year <= 50) {
      year += 2000;
    } else if (year < 100) {
      year += 1900;
    }
    
    return new Date(year, month, day);
  }
  
  // Fallback to standard Date parsing
  return new Date(dateString);
}

/**
 * Check if a date string is within the specified age range
 */
export function isWithinAgeRange(dateString, ageRange) {
  if (!dateString || !ageRange) return true;
  
  const recordDate = parseDateString(dateString);
  if (!recordDate || isNaN(recordDate.getTime())) return true; // Invalid date, don't filter
  
  const now = new Date();
  
  switch (ageRange) {
    case 'since-reset':
      const lastReset = getLastRecordResetDate();
      return recordDate >= lastReset;
    
    case '1-hour':
      return (now - recordDate) <= (1 * 60 * 60 * 1000);
    
    case '6-hours':
      return (now - recordDate) <= (6 * 60 * 60 * 1000);
    
    case '12-hours':
      return (now - recordDate) <= (12 * 60 * 60 * 1000);
    
    case '1-day':
      return (now - recordDate) <= (1 * 24 * 60 * 60 * 1000);
    
    case '3-days':
      return (now - recordDate) <= (3 * 24 * 60 * 60 * 1000);
    
    case '7-days':
      return (now - recordDate) <= (7 * 24 * 60 * 60 * 1000);
    
    case '30-days':
      return (now - recordDate) <= (30 * 24 * 60 * 60 * 1000);
    
    case '90-days':
      return (now - recordDate) <= (90 * 24 * 60 * 60 * 1000);
    
    default:
      return true; // No filter
  }
} 