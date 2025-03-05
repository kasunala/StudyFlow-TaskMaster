import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";

export type UserTier = "free" | "paid";

interface UserContextType {
  userTier: UserTier;
  isLoading: boolean;
  upgradeToPaid: () => Promise<void>;
}

const UserContext = createContext<UserContextType>(null!);

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [isLoading, setIsLoading] = useState(true);
  const db = getFirestore(app);

  // Load user tier from Firestore when user logs in
  useEffect(() => {
    const loadUserTier = async () => {
      if (currentUser) {
        try {
          setIsLoading(true);
          const userDocRef = doc(db, "userTiers", currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists() && userDoc.data().tier) {
            setUserTier(userDoc.data().tier as UserTier);
          } else {
            // If no tier is set, default to free and save it
            await setDoc(userDocRef, { tier: "free" }, { merge: true });
            setUserTier("free");
          }
        } catch (error) {
          console.error("Error loading user tier:", error);
          setUserTier("free"); // Default to free on error
        } finally {
          setIsLoading(false);
        }
      } else {
        setUserTier("free"); // Default to free when not logged in
        setIsLoading(false);
      }
    };

    loadUserTier();
  }, [currentUser, db]);

  // Function to upgrade user to paid tier
  const upgradeToPaid = async () => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, "userTiers", currentUser.uid);
      await setDoc(userDocRef, { tier: "paid" }, { merge: true });
      setUserTier("paid");
      console.log("User upgraded to paid tier");
    } catch (error) {
      console.error("Error upgrading user tier:", error);
    }
  };

  const value = {
    userTier,
    isLoading,
    upgradeToPaid,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
