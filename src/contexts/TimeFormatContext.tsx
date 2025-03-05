import React, { createContext, useContext, useState, useEffect } from "react";

type TimeFormat = "12h" | "24h";

interface TimeFormatContextType {
  timeFormat: TimeFormat;
  toggleTimeFormat: () => void;
  formatTime: (time: string | Date) => string;
}

const TimeFormatContext = createContext<TimeFormatContextType>(null!);

export function useTimeFormat() {
  return useContext(TimeFormatContext);
}

export function TimeFormatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to 12-hour format
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("12h");

  // Load saved preference from localStorage if available
  useEffect(() => {
    const savedFormat = localStorage.getItem("timeFormat");
    if (savedFormat === "12h" || savedFormat === "24h") {
      setTimeFormat(savedFormat);
    }
  }, []);

  // Toggle between 12h and 24h formats
  const toggleTimeFormat = () => {
    const newFormat = timeFormat === "12h" ? "24h" : "12h";
    setTimeFormat(newFormat);
    localStorage.setItem("timeFormat", newFormat);
  };

  // Format time string based on current format preference
  const formatTime = (time: string | Date): string => {
    if (!time) return "";

    let hours: number;
    let minutes: number;

    if (typeof time === "string") {
      // Handle string format "HH:MM"
      const [hourStr, minuteStr] = time.split(":");
      hours = parseInt(hourStr);
      minutes = parseInt(minuteStr);
    } else {
      // Handle Date object
      hours = time.getHours();
      minutes = time.getMinutes();
    }

    if (timeFormat === "24h") {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } else {
      // 12-hour format with AM/PM
      const amPm = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${amPm}`;
    }
  };

  const value = {
    timeFormat,
    toggleTimeFormat,
    formatTime,
  };

  return (
    <TimeFormatContext.Provider value={value}>
      {children}
    </TimeFormatContext.Provider>
  );
}
