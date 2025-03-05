import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>(null!);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const { currentUser } = useAuth();
  const db = getFirestore(app);

  // Load theme preference from localStorage first (for immediate display)
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  // Then load from Firestore if user is logged in (for persistence across devices)
  useEffect(() => {
    const loadUserTheme = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, "userPreferences", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data().theme) {
            const userTheme = userDoc.data().theme as Theme;
            setTheme(userTheme);
            localStorage.setItem("theme", userTheme);
            document.documentElement.classList.toggle(
              "dark",
              userTheme === "dark",
            );
          }
        } catch (error) {
          console.error("Error loading user theme preference:", error);
        }
      }
    };

    loadUserTheme();
  }, [currentUser, db]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");

    // Save to Firestore if user is logged in
    if (currentUser) {
      try {
        const userDocRef = doc(db, "userPreferences", currentUser.uid);
        await setDoc(userDocRef, { theme: newTheme }, { merge: true });
      } catch (error) {
        console.error("Error saving theme preference:", error);
      }
    }
  };

  const value = {
    theme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
