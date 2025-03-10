import { CalendarTask } from "@/contexts/CalendarContext";

/**
 * Checks if a task would overlap with existing tasks
 * @param startTime Start time in format "HH:MM"
 * @param duration Duration in minutes
 * @param existingTasks Array of existing calendar tasks
 * @param taskIdToExclude Optional ID of task to exclude from overlap check
 * @param isBlockedTime Whether the task being checked is a blocked time
 * @returns True if there is an overlap, false otherwise
 */
export const checkTimeOverlap = (
  startTime: string,
  duration: number,
  existingTasks: CalendarTask[],
  taskIdToExclude?: string,
  isBlockedTime?: boolean,
): boolean => {
  // Only check tasks for the selected date
  const tasksForDay = taskIdToExclude
    ? existingTasks.filter((task) => task.id !== taskIdToExclude)
    : existingTasks;

  // Convert the new task's start and end times to minutes since midnight
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = startMinutes + duration;

  // Check against each existing task
  for (const task of tasksForDay) {
    if (!task.startTime) continue;

    // Remove the condition that allows regular tasks to overlap with each other
    // Now all tasks will be checked for overlap regardless of their type

    const [taskStartHour, taskStartMinute] = task.startTime
      .split(":")
      .map(Number);
    const taskStartMinutes = taskStartHour * 60 + taskStartMinute;
    const taskEndMinutes = taskStartMinutes + (task.duration || 30);

    // Check for overlap
    if (
      (startMinutes >= taskStartMinutes && startMinutes < taskEndMinutes) || // New task starts during existing task
      (endMinutes > taskStartMinutes && endMinutes <= taskEndMinutes) || // New task ends during existing task
      (startMinutes <= taskStartMinutes && endMinutes >= taskEndMinutes) // New task completely contains existing task
    ) {
      return true; // Overlap detected
    }
  }

  return false; // No overlap
};

/**
 * Calculates the end time based on start time and duration
 * @param startTime Start time in format "HH:MM"
 * @param durationMinutes Duration in minutes
 * @returns End time in format "HH:MM"
 */
export const calculateEndTime = (
  startTime: string,
  durationMinutes: number,
): string => {
  if (!startTime) return "";
  const [hourStr, minuteStr] = startTime.split(":");
  const [hour, minute] = [parseInt(hourStr), parseInt(minuteStr)];

  let totalMinutes = hour * 60 + minute + durationMinutes;
  const newHour = Math.floor(totalMinutes / 60) % 24;
  const newMinute = totalMinutes % 60;

  return `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`;
}; 