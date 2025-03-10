import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { checkTimeOverlap, calculateEndTime } from "@/utils/calendarUtils";

// Initialize Firestore only if Firebase is available
let db: any;
try {
  db = getFirestore(app);
} catch (error) {
  console.error("Firestore initialization error:", error);
  // Create a mock db for development/testing
  db = {
    collection: () => ({}),
    doc: () => ({}),
    setDoc: async () => {},
    deleteDoc: async () => {},
    query: () => ({}),
    getDocs: async () => ({ forEach: () => {} }),
  };
}

export interface CalendarTask {
  id: string;
  title: string;
  completed: boolean;
  assignmentId: string;
  assignmentTitle: string;
  startTime?: string; // Format: "HH:MM" (24-hour format)
  endTime?: string; // Format: "HH:MM" (24-hour format)
  duration?: number; // Duration in minutes
  date?: string; // ISO date string format YYYY-MM-DD
  isBlockedTime?: boolean; // Flag to indicate if this is a blocked time entry
  isRecurring?: boolean; // Flag to indicate if this is a recurring event
  recurrenceType?: "daily" | "weekly" | null; // Type of recurrence
  recurrenceEndDate?: string; // End date for recurring events
}

interface CalendarContextType {
  calendarTasks: CalendarTask[];
  addCalendarTask: (task: CalendarTask) => Promise<void>;
  removeCalendarTask: (taskId: string) => Promise<void>;
  toggleCalendarTask: (taskId: string) => Promise<void>;
  updateCalendarTaskTime: (
    taskId: string,
    startTime: string,
    endTime?: string,
    duration?: number,
  ) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType>(null!);

export const useCalendar = () => {
  return useContext(CalendarContext);
};

export const CalendarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { currentUser } = useAuth();
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);

  // Load calendar tasks from Firestore when user logs in
  useEffect(() => {
    const loadCalendarTasks = async () => {
      if (currentUser) {
        try {
          const tasksQuery = query(
            collection(db, "calendarTasks"),
            where("userId", "==", currentUser.uid),
          );

          const querySnapshot = await getDocs(tasksQuery);
          const loadedTasks: CalendarTask[] = [];

          querySnapshot.forEach((doc) => {
            loadedTasks.push({ id: doc.id, ...doc.data() } as CalendarTask);
          });

          setCalendarTasks(loadedTasks);
        } catch (error) {
          console.error("Error loading calendar tasks:", error);
        }
      }
    };

    loadCalendarTasks();
  }, [currentUser]);

  const addCalendarTask = async (task: CalendarTask) => {
    if (!currentUser) {
      console.log("No current user, cannot add calendar task");
      return;
    }

    try {
      console.log("Adding calendar task:", task);
      
      // Check if task already exists
      if (calendarTasks.some((t) => t.id === task.id)) {
        console.log("Task already exists in calendar");
        return;
      }

      // Get tasks for the same date
      const tasksForDate = calendarTasks.filter(t => t.date === task.date);
      
      // Check for overlaps with all existing tasks
      if (task.startTime && task.duration) {
        const hasOverlap = checkTimeOverlap(
          task.startTime,
          task.duration,
          tasksForDate,
          undefined,
          task.isBlockedTime
        );
        
        if (hasOverlap) {
          console.log("Task overlaps with existing tasks, cannot add");
          // Dispatch an event to notify components that there was an overlap
          window.dispatchEvent(new CustomEvent('calendar-task-overlap', {
            detail: { taskId: task.id, message: "Task overlaps with existing tasks" }
          }));
          return;
        }
      }

      // Create a new document reference
      const tasksCollection = collection(db, "calendarTasks");
      const taskDocRef = doc(tasksCollection, task.id);

      const taskWithUser = {
        ...task,
        userId: currentUser.uid,
        addedAt: new Date().toISOString(),
      };

      // Save to Firestore
      await setDoc(taskDocRef, taskWithUser);
      console.log("Task saved to Firestore:", taskWithUser);

      // Update local state
      setCalendarTasks((prevTasks) => [...prevTasks, taskWithUser]);
      console.log("Local calendar tasks updated");
      
      // Dispatch an event to notify components that calendar tasks have been updated
      window.dispatchEvent(new CustomEvent('calendar-tasks-updated'));
    } catch (error) {
      console.error("Error adding calendar task:", error);
    }
  };

  const removeCalendarTask = async (taskId: string) => {
    if (!currentUser) return;

    try {
      // Delete from Firestore
      const taskDocRef = doc(db, "calendarTasks", taskId);
      await deleteDoc(taskDocRef);

      // Update local state
      setCalendarTasks(calendarTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error removing calendar task:", error);
    }
  };

  const toggleCalendarTask = async (taskId: string) => {
    if (!currentUser) return;

    try {
      // Find the task to update
      const taskToUpdate = calendarTasks.find((task) => task.id === taskId);
      if (!taskToUpdate) return;

      // Create updated task object
      const updatedTask = {
        ...taskToUpdate,
        completed: !taskToUpdate.completed,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore
      const taskDocRef = doc(db, "calendarTasks", taskId);
      await setDoc(taskDocRef, updatedTask, { merge: true });

      // Update local state
      setCalendarTasks(
        calendarTasks.map((task) => {
          if (task.id === taskId) {
            return updatedTask;
          }
          return task;
        }),
      );
    } catch (error) {
      console.error("Error toggling calendar task:", error);
    }
  };

  const updateCalendarTaskTime = async (
    taskId: string,
    startTime: string,
    endTime?: string,
    duration?: number,
  ) => {
    if (!currentUser) return;

    try {
      // Find the task to update
      const taskToUpdate = calendarTasks.find((task) => task.id === taskId);
      if (!taskToUpdate) return;

      // Calculate duration if not provided
      const calculatedDuration = duration || 30;
      const calculatedEndTime = endTime || calculateEndTime(startTime, calculatedDuration);

      // Get tasks for the same date
      const tasksForDate = calendarTasks.filter(t => t.date === taskToUpdate.date);
      
      // Check for overlaps with all existing tasks
      const hasOverlap = checkTimeOverlap(
        startTime,
        calculatedDuration,
        tasksForDate,
        taskId,
        taskToUpdate.isBlockedTime
      );
      
      if (hasOverlap) {
        console.log("Task would overlap with existing tasks, cannot update");
        // Dispatch an event to notify components that there was an overlap
        window.dispatchEvent(new CustomEvent('calendar-task-overlap', {
          detail: { taskId: taskId, message: "Task would overlap with existing tasks" }
        }));
        return;
      }

      // Create updated task object
      const updatedTask = {
        ...taskToUpdate,
        startTime,
        endTime: calculatedEndTime,
        duration: calculatedDuration,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore
      const taskDocRef = doc(db, "calendarTasks", taskId);
      await setDoc(taskDocRef, updatedTask, { merge: true });

      // Update local state
      setCalendarTasks(
        calendarTasks.map((task) => {
          if (task.id === taskId) {
            return updatedTask;
          }
          return task;
        }),
      );
    } catch (error) {
      console.error("Error updating calendar task time:", error);
    }
  };

  const value = {
    calendarTasks,
    addCalendarTask,
    removeCalendarTask,
    toggleCalendarTask,
    updateCalendarTaskTime,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};
