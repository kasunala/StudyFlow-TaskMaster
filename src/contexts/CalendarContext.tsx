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

// Helper function to calculate end time based on start time and duration
const calculateEndTime = (
  startTime: string,
  durationMinutes: number,
): string => {
  const [hourStr, minuteStr] = startTime.split(":");
  const [hour, minute] = [parseInt(hourStr), parseInt(minuteStr)];

  let totalMinutes = hour * 60 + minute + durationMinutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;

  return `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`;
};

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
    if (!currentUser) return;

    try {
      // Check if task already exists
      if (calendarTasks.some((t) => t.id === task.id)) {
        console.log("Task already exists in calendar");
        return;
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

      // Update local state
      setCalendarTasks([...calendarTasks, taskWithUser]);
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

      // Create updated task object
      const updatedTask = {
        ...taskToUpdate,
        startTime,
        endTime: endTime || calculateEndTime(startTime, duration || 30),
        duration: duration || 30,
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
