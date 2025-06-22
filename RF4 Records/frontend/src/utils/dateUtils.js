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
 * Check if a date string is within the specified age range
 */
export function isWithinAgeRange(dateString, ageRange) {
  if (!dateString || !ageRange) return true;
  
  const recordDate = new Date(dateString);
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