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
    
    // Create date at noon to avoid timezone issues with day comparisons
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  
  // Fallback to standard Date parsing
  return new Date(dateString);
}

/**
 * Check if a record is within the specified age range
 * For time-based filters (hours), use created_at (when we scraped it)
 * For day-based filters, use date (when the fish was caught)
 */
export function isWithinAgeRange(record, ageRange) {
  if (!record || !ageRange) return true;
  
  const now = new Date();
  
  switch (ageRange) {
    case 'since-reset':
      // Use created_at (scrape time) for reset comparison - show data scraped since last reset
      if (!record.created_at) return true; // No scrape timestamp, include it
      const resetScrapedDate = new Date(record.created_at);
      if (isNaN(resetScrapedDate.getTime())) return true;
      const lastReset = getLastRecordResetDate();
      return resetScrapedDate >= lastReset;
    
    case '1-hour':
    case '6-hours':
    case '12-hours':
      // Use created_at (scrape time) for hour-based filters
      if (!record.created_at) return true; // No scrape timestamp, include it
      const scrapedDate = new Date(record.created_at);
      if (isNaN(scrapedDate.getTime())) return true;
      
      const hours = ageRange === '1-hour' ? 1 : (ageRange === '6-hours' ? 6 : 12);
      return (now.getTime() - scrapedDate.getTime()) <= (hours * 60 * 60 * 1000);
    
    case '1-day':
    case '3-days':
    case '7-days':
    case '30-days':
    case '90-days':
      // Use fishing date for day-based filters
      const recordDate = parseDateString(record.date);
      if (!recordDate || isNaN(recordDate.getTime())) return true;
      
      // For day-based comparisons, compare calendar days rather than 24-hour periods
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const recordDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
      const daysDiff = Math.floor((today.getTime() - recordDay.getTime()) / (24 * 60 * 60 * 1000));
      
      const maxDays = ageRange === '1-day' ? 1 : 
                     ageRange === '3-days' ? 3 :
                     ageRange === '7-days' ? 7 :
                     ageRange === '30-days' ? 30 : 90;
      
      return daysDiff <= maxDays;
    
    default:
      return true; // No filter
  }
} 