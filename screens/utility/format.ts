import moment from "moment";

/**
 * Converts a time string (e.g., "9:00 AM", "15:30") to "HH:mm" format.
 */
export const formatTimeForAPI = (time: string): string => {
  // Handles 12-hour or 24-hour inputs
  const formatted = moment(time, ["h:mm A", "HH:mm"]).format("HH:mm");
  return formatted;
};
