import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { Task, Assignment } from "@/types/assignment";
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
import { auth } from "@/lib/firebase";

// Use the existing Firebase instance
const db = getFirestore();

interface AssignmentContextType {
  assignments: Assignment[];
  isFirstLogin: boolean;
  setIsFirstLogin: (value: boolean) => void;
  createAssignment: (assignment: Omit<Assignment, "id">) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  toggleTask: (assignmentId: string, taskId: string) => Promise<void>;
  updateAssignment: (assignment: Assignment) => Promise<void>;
}

const AssignmentContext = createContext<AssignmentContextType>(null!);

export const useAssignments = () => {
  return useContext(AssignmentContext);
};

const AssignmentProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Check if this is the user's first login and load assignments from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          // Check if user has logged in before
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // First time user
            setIsFirstLogin(true);
            await setDoc(userDocRef, { hasLoggedIn: true });
          }

          // Load assignments from Firestore
          const assignmentsQuery = query(
            collection(db, "assignments"),
            where("userId", "==", currentUser.uid),
          );

          const querySnapshot = await getDocs(assignmentsQuery);
          const loadedAssignments: Assignment[] = [];

          querySnapshot.forEach((doc) => {
            loadedAssignments.push({ id: doc.id, ...doc.data() } as Assignment);
          });

          setAssignments(loadedAssignments);
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    };

    loadUserData();
  }, [currentUser]);

  // We don't need to save assignments on every change anymore since we'll save them individually

  const createAssignment = async (assignment: Omit<Assignment, "id">) => {
    if (!currentUser) {
      console.error("No user logged in");
      return;
    }

    try {
      console.log("Creating assignment:", assignment);

      // Create a new document reference
      const assignmentsCollection = collection(db, "assignments");
      const newAssignmentRef = doc(assignmentsCollection);

      const newAssignment = {
        ...assignment,
        id: newAssignmentRef.id,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
      };

      console.log("New assignment with ID:", newAssignment);

      // Save to Firestore
      await setDoc(newAssignmentRef, newAssignment);
      console.log("Saved to Firestore");

      // Update local state - create a new array to ensure state update
      const updatedAssignments = [...assignments, newAssignment];
      console.log("Updated assignments array:", updatedAssignments);
      setAssignments(updatedAssignments);
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!currentUser) return;

    try {
      // Delete from Firestore
      const assignmentDocRef = doc(db, "assignments", id);
      await deleteDoc(assignmentDocRef);

      // Update local state
      setAssignments(assignments.filter((assignment) => assignment.id !== id));
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  const toggleTask = async (assignmentId: string, taskId: string) => {
    if (!currentUser) return;

    try {
      // Find the assignment to update
      const assignmentToUpdate = assignments.find((a) => a.id === assignmentId);
      if (!assignmentToUpdate) return;

      // Create updated assignment object
      const updatedAssignment = {
        ...assignmentToUpdate,
        tasks: assignmentToUpdate.tasks.map((task) => {
          if (task.id === taskId) {
            return { ...task, completed: !task.completed };
          }
          return task;
        }),
      };

      // Update in Firestore
      const assignmentDocRef = doc(db, "assignments", assignmentId);
      await setDoc(assignmentDocRef, updatedAssignment, { merge: true });

      // Update local state
      setAssignments(
        assignments.map((assignment) => {
          if (assignment.id === assignmentId) {
            return updatedAssignment;
          }
          return assignment;
        }),
      );
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const updateAssignment = async (updatedAssignment: Assignment) => {
    if (!currentUser) return;

    try {
      // Update in Firestore
      const assignmentDocRef = doc(db, "assignments", updatedAssignment.id);
      await setDoc(
        assignmentDocRef,
        {
          ...updatedAssignment,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // Update local state
      setAssignments(
        assignments.map((assignment) => {
          if (assignment.id === updatedAssignment.id) {
            return {
              ...updatedAssignment,
              updatedAt: new Date().toISOString(),
            };
          }
          return assignment;
        }),
      );
    } catch (error) {
      console.error("Error updating assignment:", error);
    }
  };

  const value = {
    assignments,
    isFirstLogin,
    setIsFirstLogin,
    createAssignment,
    deleteAssignment,
    toggleTask,
    updateAssignment,
  };

  return (
    <AssignmentContext.Provider value={value}>
      {children}
    </AssignmentContext.Provider>
  );
};

export { AssignmentProvider };
