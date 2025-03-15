import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

// Initialize Firestore
let db: any;
try {
  db = getFirestore(app);
} catch (error) {
  console.error("Firestore initialization error:", error);
  // Create a mock db for development/testing
  db = {
    doc: () => ({}),
    setDoc: async () => {},
    getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  };
}

export interface NotificationSettings {
  enableBlockedTimeNotifications: boolean;
  notificationTimeRangeBefore: number; // hours before current time
  notificationTimeRangeAfter: number; // hours after current time
}

interface NotificationContextType {
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
}

const defaultSettings: NotificationSettings = {
  enableBlockedTimeNotifications: true,
  notificationTimeRangeBefore: 12,
  notificationTimeRangeAfter: 12,
};

const NotificationContext = createContext<NotificationContextType>(null!);

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { currentUser } = useAuth();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultSettings);

  // Load notification settings from Firestore when user logs in
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (currentUser) {
        try {
          const settingsDocRef = doc(db, "notificationSettings", currentUser.uid);
          const settingsDoc = await getDoc(settingsDocRef);

          if (settingsDoc.exists()) {
            setNotificationSettings({
              ...defaultSettings,
              ...settingsDoc.data() as NotificationSettings,
            });
          } else {
            // If no settings exist, create default settings
            await setDoc(settingsDocRef, defaultSettings);
          }
        } catch (error) {
          console.error("Error loading notification settings:", error);
        }
      }
    };

    loadNotificationSettings();
  }, [currentUser]);

  // Update notification settings
  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!currentUser) return;

    try {
      const updatedSettings = {
        ...notificationSettings,
        ...settings,
      };

      // Update in Firestore
      const settingsDocRef = doc(db, "notificationSettings", currentUser.uid);
      await setDoc(settingsDocRef, updatedSettings);

      // Update local state
      setNotificationSettings(updatedSettings);
    } catch (error) {
      console.error("Error updating notification settings:", error);
    }
  };

  const value = {
    notificationSettings,
    updateNotificationSettings,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 