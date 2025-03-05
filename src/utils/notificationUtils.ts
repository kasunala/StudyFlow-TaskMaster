import { CalendarTask } from "@/contexts/CalendarContext";
import { Assignment, Task } from "@/types/assignment";

export interface Notification {
  id: string;
  title: string;
  assignment: string;
  dueDate: string;
  isRead: boolean;
  taskId: string;
  assignmentId: string;
}

// Function to check if a task is due within the next 12 hours
export const isTaskDueSoon = (task: CalendarTask): boolean => {
  if (!task.date || !task.startTime || task.completed) return false;

  const now = new Date();
  // Create date object and handle timezone issues by using local timezone
  // Use the date parts directly to avoid timezone shifts
  const [year, month, day] = task.date.split("-").map(Number);
  const [hours, minutes] = task.startTime.split(":").map(Number);
  const taskDate = new Date(year, month - 1, day, hours, minutes);

  // Calculate time difference in milliseconds
  const timeDiff = taskDate.getTime() - now.getTime();

  // Convert to hours
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // Return true if the task is due within the next 12 hours (including overdue tasks within the last 12 hours)
  return hoursDiff >= -12 && hoursDiff <= 12;
};

// Function to generate notifications from calendar tasks
export const generateNotifications = (
  calendarTasks: CalendarTask[],
  assignments: Assignment[],
): Notification[] => {
  // Filter tasks that are due within the next 12 hours and not completed
  const upcomingTasks = calendarTasks
    .filter((task) => {
      // Log each task for debugging
      console.log("Checking task for notification:", task);
      const result = isTaskDueSoon(task);
      console.log("Is task due soon:", result);
      return result;
    })
    .sort((a, b) => {
      // Sort by date and time using local timezone
      const [yearA, monthA, dayA] = a.date.split("-").map(Number);
      const [hoursA, minutesA] = a.startTime.split(":").map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA);

      const [yearB, monthB, dayB] = b.date.split("-").map(Number);
      const [hoursB, minutesB] = b.startTime.split(":").map(Number);
      const dateB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB);

      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 6); // Limit to 6 tasks

  // Convert tasks to notifications
  return upcomingTasks.map((task) => ({
    id: `notification-${task.id}`,
    title: task.title,
    assignment: task.assignmentTitle,
    dueDate: (() => {
      // Create date in local timezone to avoid date shifting
      const [year, month, day] = task.date.split("-").map(Number);
      const [hours, minutes] = task.startTime.split(":").map(Number);
      return new Date(year, month - 1, day, hours, minutes).toISOString();
    })(), // Convert to ISO string for consistent date handling
    isRead: false,
    taskId: task.id,
    assignmentId: task.assignmentId,
  }));
};
