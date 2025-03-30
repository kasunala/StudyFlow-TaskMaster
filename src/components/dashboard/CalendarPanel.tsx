import React, { useState, useRef, useEffect } from "react";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDrop, useDrag } from "react-dnd";
import BlockTimeDialog from "./BlockTimeDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { checkTimeOverlap, calculateEndTime } from "@/utils/calendarUtils";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration?: number; // Duration in minutes
}

interface CalendarTask extends Task {
  assignmentId: string;
  assignmentTitle: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  date?: string; // ISO date string format YYYY-MM-DD
  isBlockedTime?: boolean;
}

interface CalendarPanelProps {
  calendarTasks?: CalendarTask[];
  onAddTask?: (task: CalendarTask) => void;
  onRemoveTask?: (taskId: string) => void;
  onToggleTask?: (taskId: string) => void;
  onUpdateTaskTime?: (
    taskId: string,
    startTime: string,
    endTime?: string,
    duration?: number,
  ) => void;
  selectedDate?: Date;
  isEmbedded?: boolean;
  hideScheduleHeader?: boolean;
  hideViewMonthButton?: boolean;
}

// Generate time slots for the calendar view (hourly increments)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourFormatted = hour.toString().padStart(2, "0");
    slots.push(`${hourFormatted}:00`);
  }
  // Add the last slot (midnight of next day)
  slots.push("00:00");
  return slots;
};

// Generate time slots for the time selection dropdown (15-minute increments)
const generateTimeSelectionSlots = () => {
  const slots = [];
  for (let hour = 0; hour <= 23; hour++) {
    const hourFormatted = hour.toString().padStart(2, "0");
    for (let minute = 0; minute < 60; minute += 15) {
      const minuteFormatted = minute.toString().padStart(2, "0");
      slots.push(`${hourFormatted}:${minuteFormatted}`);
    }
  }
  return slots;
};

// This function is now just a wrapper around the context's formatTime function
// It will be initialized in the component

// Calculate end time based on start time and duration is now imported from calendarUtils

const TIME_SLOTS = generateTimeSlots();
const TIME_SELECTION_SLOTS = generateTimeSelectionSlots();

// Calculate the top position for a task based on its start time
const calculateTaskPosition = (startTime: string): number => {
  if (!startTime) return 0;
  const [hourStr, minuteStr] = startTime.split(":");
  const [hour, minute] = [parseInt(hourStr), parseInt(minuteStr)];

  // Each hour is 60px tall, starting from 12:00 AM (0px)
  const minutesSinceMidnight = hour * 60 + minute;
  return (minutesSinceMidnight / 60) * 60; // 60px per hour
};

// Calculate the height of a task based on its duration
const calculateTaskHeight = (duration: number): number => {
  // 60px per hour, so 1px per minute
  return (duration / 60) * 60;
};

const CalendarPanel = ({
  calendarTasks = [],
  onAddTask = () => {},
  onRemoveTask = () => {},
  onToggleTask = () => {},
  onUpdateTaskTime = () => {},
  selectedDate,
  isEmbedded = false,
  hideScheduleHeader = false,
  hideViewMonthButton = false,
}: CalendarPanelProps) => {
  const [showBlockTimeDialog, setShowBlockTimeDialog] = useState(false);
  // Get time format functions from context
  const { timeFormat, toggleTimeFormat, formatTime } = useTimeFormat();

  // Format time for display based on current format preference
  const formatTimeForDisplay = (time: string) => {
    if (!time) return "";
    return formatTime(time);
  };
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date());
  // Use provided selectedDate if available, otherwise use internal state
  const effectiveSelectedDate = selectedDate || internalSelectedDate;
  const [visibleTimeSlots, setVisibleTimeSlots] = useState(TIME_SLOTS);
  const [showMonthView, setShowMonthView] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Reference to the calendar grid for position calculations
  const calendarGridRef = useRef<HTMLDivElement>(null);

  // State for current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  // State for managing UI
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<CalendarTask | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuTask, setContextMenuTask] = useState<CalendarTask | null>(null);
  
  // Add a force update counter for gentle refreshes from focus mode
  const [forceUpdateCounter, setForceUpdateCounter] = useState<number>(0);
  
  // Create a ref to store current date to avoid stale closures
  const currentDateRef = useRef<Date>(internalSelectedDate);

  // Update current time every minute
  useEffect(() => {
    // Set initial time immediately
    const updateCurrentTime = () => {
      const now = new Date();
      console.log("Current time updated:", now.toLocaleTimeString());
      setCurrentTime(now);

      // Force redraw of the current time indicator
      const timeIndicator = document.querySelector(".current-time-indicator");
      if (timeIndicator) {
        timeIndicator.classList.remove("current-time-indicator");
        void (timeIndicator as HTMLElement).offsetHeight;
        timeIndicator.classList.add("current-time-indicator");
      }
    };

    updateCurrentTime();

    const timer = setInterval(updateCurrentTime, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Format selected date as ISO string (YYYY-MM-DD)
  // Ensure we're working with a proper Date object and using local timezone
  const selectedDateISO =
    effectiveSelectedDate instanceof Date
      ? `${effectiveSelectedDate.getFullYear()}-${String(effectiveSelectedDate.getMonth() + 1).padStart(2, "0")}-${String(effectiveSelectedDate.getDate()).padStart(2, "0")}`
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  // Scroll to current time indicator when calendar view is first shown
  useEffect(() => {
    if (
      !showMonthView &&
      selectedDateISO ===
        (() => {
          const today = new Date();
          return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        })()
    ) {
      // Short delay to ensure the calendar has rendered
      setTimeout(() => {
        const currentTimeIndicator = document.getElementById(
          "current-time-indicator",
        );
        if (currentTimeIndicator) {
          currentTimeIndicator.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          console.log("Calendar panel scrolled to current time indicator");
        }
      }, 300);
    }
  }, [showMonthView, selectedDateISO]);

  // Listen for focus-calendar-task events
  useEffect(() => {
    console.log("Setting up focus-calendar-task event listener in CalendarPanel");
    
    const handleFocusTask = (event: any) => {
      console.log("Focus calendar task event received in CalendarPanel", event.detail);
      console.log("Current calendarTasks:", calendarTasks);
      console.log("Current showMonthView:", showMonthView);
      
      const { taskId, date: eventDate, startTime: eventStartTime, assignmentId: eventAssignmentId } = event.detail;

      // Find the task in calendar tasks
      const task = calendarTasks.find((task) => task.id === taskId);
      console.log("Found task in calendarTasks:", task);

      // Always switch to day view first
      if (showMonthView) {
        console.log("Switching from month view to day view");
        setShowMonthView(false);
      }

      // Set the date based on the task or event
      let taskDate: Date;
      let taskDateISO: string;
      
      if (task && task.date) {
        // Use the task's date
        taskDate = new Date(task.date);
        taskDateISO = task.date;
      } else if (eventDate) {
        // Use the date from the event
        taskDate = new Date(eventDate);
        taskDateISO = eventDate;
      } else {
        // Default to today
        taskDate = new Date();
        taskDateISO = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, "0")}-${String(taskDate.getDate()).padStart(2, "0")}`;
      }
      
      console.log("Setting calendar to date:", taskDate, "ISO:", taskDateISO);
      
      // Check if we need to change the date
      const currentDateISO = `${effectiveSelectedDate.getFullYear()}-${String(effectiveSelectedDate.getMonth() + 1).padStart(2, "0")}-${String(effectiveSelectedDate.getDate()).padStart(2, "0")}`;
      const dateChanged = currentDateISO !== taskDateISO;
      
      console.log("Current date:", currentDateISO, "Target date:", taskDateISO, "Date changed:", dateChanged);
      
      if (dateChanged) {
        // Update the month and year state variables to match the task date
        setSelectedMonth(taskDate.getMonth());
        setSelectedYear(taskDate.getFullYear());
        setInternalSelectedDate(taskDate);
        
        // Force a re-render to ensure the calendar updates with the new date
        setTimeout(() => {
          // Dispatch an event to force a re-render
          window.dispatchEvent(new Event('resize'));
          
          // After the re-render, try to find and highlight the task
          setTimeout(() => {
            findAndHighlightTask(taskId, eventAssignmentId);
          }, 500);
        }, 100);
      } else {
        // If the date hasn't changed, just find and highlight the task immediately
        findAndHighlightTask(taskId, eventAssignmentId);
      }
    };
    
    // Helper function to find and highlight a task
    const findAndHighlightTask = (taskId: string, assignmentId?: string) => {
      console.log("Finding and highlighting task:", taskId);
      
      // Try to find the task element
      const taskElement = document.getElementById(`calendar-task-${taskId}`);
      console.log("Task element found:", taskElement);
      
      if (taskElement) {
        // Force a reflow to ensure styles are applied correctly
        void taskElement.offsetHeight;
        
        // Remove any existing highlight classes first
        document.querySelectorAll('.highlight-task').forEach(el => {
          el.classList.remove('highlight-task');
        });
        
        // Add highlight class with a slight delay to ensure DOM is ready
        setTimeout(() => {
          // Add highlight class
          taskElement.classList.add("highlight-task");
          console.log("Added highlight class to element");
          
          // Force another reflow
          void taskElement.offsetHeight;
          
          // Apply inline styles as a backup
          taskElement.style.boxShadow = "0 0 15px 5px rgba(59, 130, 246, 0.8)";
          taskElement.style.zIndex = "50";
          taskElement.style.border = "3px solid #3b82f6";
          taskElement.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
          
          // Scroll the task into view
          taskElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          console.log("Scrolled element into view");
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            taskElement.classList.remove("highlight-task");
            // Reset inline styles
            taskElement.style.boxShadow = "";
            taskElement.style.zIndex = "";
            taskElement.style.border = "";
            taskElement.style.backgroundColor = "";
          }, 3000);
        }, 50);
      } else {
        console.error("Task element not found in DOM for ID:", taskId);
        
        // List all calendar tasks in the DOM to help debug
        const allCalendarTasks = document.querySelectorAll('[id^="calendar-task-"]');
        console.log("All calendar tasks in DOM:", allCalendarTasks.length);
        allCalendarTasks.forEach(el => console.log("Found element with ID:", el.id));
        
        // If element not found, try again with a longer delay
        setTimeout(() => {
          const retryTaskElement = document.getElementById(`calendar-task-${taskId}`);
          console.log("Retry task element found:", retryTaskElement);
          
          if (retryTaskElement) {
            // Force a reflow
            void retryTaskElement.offsetHeight;
            
            // Remove any existing highlight classes first
            document.querySelectorAll('.highlight-task').forEach(el => {
              el.classList.remove('highlight-task');
            });
            
            // Add highlight class
            retryTaskElement.classList.add("highlight-task");
            console.log("Added highlight class to element (retry)");
            
            // Force another reflow
            void retryTaskElement.offsetHeight;
            
            // Apply inline styles as a backup
            retryTaskElement.style.boxShadow = "0 0 15px 5px rgba(59, 130, 246, 0.8)";
            retryTaskElement.style.zIndex = "50";
            retryTaskElement.style.border = "3px solid #3b82f6";
            retryTaskElement.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
            
            // Scroll the task into view
            retryTaskElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            console.log("Scrolled element into view (retry)");
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              retryTaskElement.classList.remove("highlight-task");
              // Reset inline styles
              retryTaskElement.style.boxShadow = "";
              retryTaskElement.style.zIndex = "";
              retryTaskElement.style.border = "";
              retryTaskElement.style.backgroundColor = "";
            }, 3000);
          } else {
            console.error("Task element still not found after retry for ID:", taskId);
            
            // As a last resort, try to find any task from the same assignment
            if (assignmentId) {
              const assignmentTasks = calendarTasks.filter(t => t.assignmentId === assignmentId);
              if (assignmentTasks.length > 0) {
                console.log("Trying to focus on another task from the same assignment");
                
                // Try to find any task element from the same assignment
                for (const aTask of assignmentTasks) {
                  const aTaskElement = document.getElementById(`calendar-task-${aTask.id}`);
                  if (aTaskElement) {
                    // Force a reflow
                    void aTaskElement.offsetHeight;
                    
                    // Remove any existing highlight classes first
                    document.querySelectorAll('.highlight-task').forEach(el => {
                      el.classList.remove('highlight-task');
                    });
                    
                    // Add highlight class
                    aTaskElement.classList.add("highlight-task");
                    
                    // Force another reflow
                    void aTaskElement.offsetHeight;
                    
                    // Apply inline styles as a backup
                    aTaskElement.style.boxShadow = "0 0 15px 5px rgba(59, 130, 246, 0.8)";
                    aTaskElement.style.zIndex = "50";
                    aTaskElement.style.border = "3px solid #3b82f6";
                    aTaskElement.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
                    
                    // Scroll the task into view
                    aTaskElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    
                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                      aTaskElement.classList.remove("highlight-task");
                      // Reset inline styles
                      aTaskElement.style.boxShadow = "";
                      aTaskElement.style.zIndex = "";
                      aTaskElement.style.border = "";
                      aTaskElement.style.backgroundColor = "";
                    }, 3000);
                    
                    break;
                  }
                }
              }
            }
          }
        }, 500);
      }
    };

    // Use a direct function reference for the event listener
    window.addEventListener("focus-calendar-task", handleFocusTask);

    return () => {
      window.removeEventListener("focus-calendar-task", handleFocusTask);
    };
  }, [calendarTasks, showMonthView, setShowMonthView, setSelectedMonth, setSelectedYear, setInternalSelectedDate, effectiveSelectedDate]);

  // Listen for calendar-tasks-updated events
  useEffect(() => {
    const handleCalendarTasksUpdated = (event: Event) => {
      console.log("Calendar tasks updated event received");
      
      // Check if the event is from focus mode
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.fromFocusMode) {
        console.log("Update from focus mode, preserving video player state");
        // We still want to update the UI, but gently without triggering a full rerender
        // that would affect the YouTube player in focus mode
        
        // Use a gentle approach to update just what's needed
        setForceUpdateCounter(prevState => prevState + 1);
      } else {
        // For normal updates, we can do a regular state refresh
        setInternalSelectedDate(new Date(currentDateRef.current));
      }
      
      setHoveredTimeSlot(null);
    };

    window.addEventListener("calendar-tasks-updated", handleCalendarTasksUpdated);

    return () => {
      window.removeEventListener("calendar-tasks-updated", handleCalendarTasksUpdated);
    };
  }, []);

  // Update the ref when internalSelectedDate changes
  useEffect(() => {
    currentDateRef.current = internalSelectedDate;
  }, [internalSelectedDate]);
  
  // Optional: Debug logging for force updates
  useEffect(() => {
    if (forceUpdateCounter > 0) {
      console.log(`Calendar panel gentle update #${forceUpdateCounter} from focus mode`);
    }
  }, [forceUpdateCounter]);

  // Listen for calendar-task-overlap events
  useEffect(() => {
    const handleCalendarTaskOverlap = (event: any) => {
      console.log("Calendar task overlap event received", event.detail);
      const { taskId, message } = event.detail;
      
      // Show a notification to the user
      // This could be replaced with a proper toast notification system
      alert(`Cannot schedule task: ${message}. Please choose a different time slot.`);
      
      // Highlight the task that couldn't be scheduled if it exists
      const taskElement = document.getElementById(`calendar-task-${taskId}`);
      if (taskElement) {
        taskElement.classList.add("overlap-error");
        setTimeout(() => {
          taskElement.classList.remove("overlap-error");
        }, 3000);
      }
    };

    window.addEventListener("calendar-task-overlap", handleCalendarTaskOverlap);

    return () => {
      window.removeEventListener("calendar-task-overlap", handleCalendarTaskOverlap);
    };
  }, []);

  // Listen for navigate-calendar-to-date events
  useEffect(() => {
    console.log("Setting up navigate-calendar-to-date event listener in CalendarPanel");
    
    const handleNavigateToDate = (event: any) => {
      console.log("Navigate calendar to date event received in CalendarPanel", event.detail);
      
      const { date, taskId } = event.detail;
      
      if (!date) {
        console.error("No date provided in navigate-calendar-to-date event");
        return;
      }
      
      // Parse the date
      const targetDate = new Date(date);
      console.log("Navigating calendar to date:", targetDate);
      
      // Always switch to day view first
      if (showMonthView) {
        console.log("Switching from month view to day view");
        setShowMonthView(false);
      }
      
      // Check if we need to change the date
      const currentDateISO = `${effectiveSelectedDate.getFullYear()}-${String(effectiveSelectedDate.getMonth() + 1).padStart(2, "0")}-${String(effectiveSelectedDate.getDate()).padStart(2, "0")}`;
      const targetDateISO = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
      const dateChanged = currentDateISO !== targetDateISO;
      
      console.log("Current date:", currentDateISO, "Target date:", targetDateISO, "Date changed:", dateChanged);
      
      // Update the month and year state variables to match the target date
      setSelectedMonth(targetDate.getMonth());
      setSelectedYear(targetDate.getFullYear());
      setInternalSelectedDate(targetDate);
      
      // Force a re-render to ensure the calendar updates with the new date
      setTimeout(() => {
        // Dispatch an event to force a re-render
        window.dispatchEvent(new Event('resize'));
        
        // Log the current date after the update
        const updatedDateISO = `${effectiveSelectedDate.getFullYear()}-${String(effectiveSelectedDate.getMonth() + 1).padStart(2, "0")}-${String(effectiveSelectedDate.getDate()).padStart(2, "0")}`;
        console.log("Updated date after navigation:", updatedDateISO);
        
        // Verify that the date was changed correctly
        if (updatedDateISO !== targetDateISO) {
          console.warn("Date navigation may not have worked correctly. Trying again...");
          
          // Try again with a direct approach
          setInternalSelectedDate(new Date(date));
          
          // Force another re-render
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 50);
        }
      }, 100);
    };
    
    // Use a direct function reference for the event listener
    window.addEventListener("navigate-calendar-to-date", handleNavigateToDate);
    
    return () => {
      window.removeEventListener("navigate-calendar-to-date", handleNavigateToDate);
    };
  }, [showMonthView, setShowMonthView, setSelectedMonth, setSelectedYear, setInternalSelectedDate, effectiveSelectedDate]);

  // Filter tasks for the selected date
  const filteredTasks = calendarTasks.filter((task) => {
    // If task has no date, assign it today's date for the demo using local timezone
    if (!task.date) {
      const today = new Date();
      task.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    return task.date === selectedDateISO;
  });

  console.log("Filtered tasks for date:", selectedDateISO, filteredTasks);

  // Check if a new task would overlap with existing tasks
  const checkForOverlap = (
    startTime: string,
    duration: number,
    taskIdToExclude?: string,
    isBlockedTime?: boolean,
  ): boolean => {
    return checkTimeOverlap(
      startTime,
      duration,
      filteredTasks,
      taskIdToExclude,
      isBlockedTime
    );
  };

  // Find the next available time slot after a given time
  const findNextAvailableSlot = (
    startTime: string,
    duration: number,
  ): string => {
    // Start with the given time
    let [hour, minute] = startTime.split(":").map(Number);
    let currentMinutes = hour * 60 + minute;
    
    // Get all existing tasks for the day and sort them by start time
    const sortedTasks = [...filteredTasks]
      .filter(task => task.startTime)
      .sort((a, b) => {
        const aStart = a.startTime ? timeToMinutes(a.startTime) : 0;
        const bStart = b.startTime ? timeToMinutes(b.startTime) : 0;
        return aStart - bStart;
      });
    
    // Helper function to convert time string to minutes
    function timeToMinutes(time: string): number {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    }
    
    // Helper function to convert minutes to time string
    function minutesToTime(minutes: number): string {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }
    
    // First, try the original time slot
    if (!checkForOverlap(startTime, duration)) {
      return startTime;
    }
    
    // If there's an overlap, find gaps between existing tasks
    let lastEndTime = 8 * 60; // Start at 8:00 AM (0px)
    const endOfDay = 23 * 60; // End at 11:00 PM (23px)
    
    // Add a dummy task at the end of the day
    sortedTasks.push({
      id: "end-of-day",
      title: "End of Day",
      completed: false,
      assignmentId: "",
      assignmentTitle: "",
      startTime: "23:00",
      duration: 60,
    } as CalendarTask);
    
    for (const task of sortedTasks) {
      if (!task.startTime) continue;
      
      const taskStart = timeToMinutes(task.startTime);
      
      // If there's a gap before this task that can fit our duration
      if (taskStart - lastEndTime >= duration) {
        // Check if our task would fit in this gap
        const potentialStart = minutesToTime(lastEndTime);
        if (!checkForOverlap(potentialStart, duration)) {
          return potentialStart;
        }
      }
      
      // Update lastEndTime to the end of the current task
      lastEndTime = taskStart + (task.duration || 30);
    }
    
    // If we couldn't find a gap, try after the last task
    if (lastEndTime < endOfDay - duration) {
      const potentialStart = minutesToTime(lastEndTime);
      if (!checkForOverlap(potentialStart, duration)) {
        return potentialStart;
      }
    }
    
    // If all else fails, return the original time (this should be rare)
    return startTime;
  };

  // Set up the drop target for the calendar grid
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["task", "calendar-task"],
    hover: (item: any, monitor) => {
      if (!calendarGridRef.current) return;

      // Get the mouse position relative to the calendar grid
      const hoverBoundingRect = calendarGridRef.current.getBoundingClientRect();
      const mouseY = monitor.getClientOffset()?.y || 0;
      const hoverY = mouseY - hoverBoundingRect.top;

      // Calculate the time based on the mouse position
      // Each hour is 60px in height, starting from 8:00 AM (0px)
      const hoursSince8AM = hoverY / 60;
      const hour = Math.floor(hoursSince8AM) + 8;
      const minute = Math.floor((hoursSince8AM % 1) * 60);
      const minuteRounded = minute < 30 ? 0 : 30;

      const timeSlot = `${hour.toString().padStart(2, "0")}:${minuteRounded.toString().padStart(2, "0")}`;
      setHoveredTimeSlot(timeSlot);

      // Add visual feedback for the time slot being hovered over
      const allTimeSlots = document.querySelectorAll(".time-slot");
      allTimeSlots.forEach((slot) => {
        slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
      });

      const targetHour = Math.floor(hoursSince8AM);
      const targetSlot = document.querySelector(`.time-slot-${targetHour}`);
      if (targetSlot) {
        targetSlot.classList.add("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
      }
      
      // Add a placeholder task at the hover position to show where the task will be placed
      const placeholderTask = document.getElementById("calendar-task-placeholder");
      if (placeholderTask) {
        const top = targetHour * 60;
        const duration = item.duration || 30;
        const height = (duration / 60) * 60;
        
        placeholderTask.style.top = `${top}px`;
        placeholderTask.style.height = `${height}px`;
        placeholderTask.style.display = "block";
      }
    },
    canDrop: (item, monitor) => {
      // Always allow dropping on the calendar grid
      return true;
    },
    drop: (
      item: Task & { assignmentId: string; assignmentTitle: string; type?: string },
      monitor,
    ) => {
      console.log("Item dropped on calendar grid:", item);
      if (!calendarGridRef.current || !hoveredTimeSlot) {
        console.log("No valid drop target or hovered time slot");
        return;
      }

      const duration = item.duration || 30; // Use task's duration or default to 30 minutes
      console.log("Task duration:", duration);

      // Check if the selected time slot would cause an overlap
      let finalTimeSlot = hoveredTimeSlot;
      if (checkForOverlap(hoveredTimeSlot, duration, item.id)) {
        // Find the next available time slot
        finalTimeSlot = findNextAvailableSlot(hoveredTimeSlot, duration);
        console.log("Found next available time slot:", finalTimeSlot);
      }

      // Calculate end time based on the final time slot
      const endTime = calculateEndTime(finalTimeSlot, duration);
      console.log("Calculated end time:", endTime);

      // Check if this is a new task or an existing calendar task
      const existingTask = calendarTasks.find(t => t.id === item.id);
      const isNewTask = !existingTask;
      console.log("Is new task:", isNewTask);

      if (isNewTask) {
        console.log("Adding new task to calendar");
        onAddTask({
          id: item.id,
          assignmentId: item.assignmentId || "",
          assignmentTitle: item.assignmentTitle || "",
          title: item.title,
          completed: item.completed,
          startTime: finalTimeSlot,
          endTime: endTime,
          duration: duration,
          date: selectedDateISO,
        });
        console.log("Task added to calendar");
        
        // Dispatch an event to notify that a task has been added
        window.dispatchEvent(
          new CustomEvent("calendar-tasks-updated", {
            detail: { taskId: item.id },
          })
        );
      } else {
        // This is an existing calendar task being moved or rescheduled
        console.log("Updating existing calendar task");
        onUpdateTaskTime(item.id, finalTimeSlot, endTime, duration);
        console.log("Task updated");
      }

      // Hide the placeholder
      const placeholderTask = document.getElementById("calendar-task-placeholder");
      if (placeholderTask) {
        placeholderTask.style.display = "none";
      }

      setHoveredTimeSlot(null);
      return { name: "CalendarPanel", success: true };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Format the selected date for display
  const formattedDate = effectiveSelectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Navigate to previous day
  const goToPreviousDay = () => {
    const prevDay = new Date(effectiveSelectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setInternalSelectedDate(prevDay);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const nextDay = new Date(effectiveSelectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setInternalSelectedDate(nextDay);
  };

  // Create a task component that can be dragged within the calendar
  const CalendarTaskItem = ({ task }: { task: CalendarTask }) => {
    const [{ isDragging }, drag, preview] = useDrag(() => ({
      type: "calendar-task",
      item: {
        id: task.id,
        assignmentId: task.assignmentId,
        assignmentTitle: task.assignmentTitle,
        title: task.title,
        completed: task.completed,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration,
        date: task.date,
        type: "calendar-task", // Explicitly set the type property
      },
      end: (item, monitor) => {
        // Reset any UI state when drag ends
        if (!monitor.didDrop()) {
          // If not dropped on a valid target
          console.log("Drag ended without valid drop");
        }
        
        // Hide the placeholder
        const placeholderTask = document.getElementById("calendar-task-placeholder");
        if (placeholderTask) {
          placeholderTask.style.display = "none";
        }
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
      options: {
        dropEffect: 'move',
      },
    }));

    const [isEditing, setIsEditing] = useState(false);
    const [sliderValue, setSliderValue] = useState(task.duration || 30);
    const [isHovered, setIsHovered] = useState(false);

    const top = calculateTaskPosition(task.startTime || "08:00");
    const height = calculateTaskHeight(task.duration || 30);
    const isShortTask = (task.duration || 30) < 30;

    // Determine task status based on current time and task properties
    const getTaskStatus = () => {
      if (task.completed) {
        return { 
          status: "Completed", 
          className: "bg-gray-100 dark:bg-gray-700", 
          statusText: "✅ Completed",
          borderClass: "border-gray-300 dark:border-gray-600"
        };
      }

      // Convert task date and times to Date objects for comparison
      const taskDate = task.date ? new Date(task.date) : new Date();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // If task date is in the past, it's overdue
      if (taskDate < today) {
        return { 
          status: "Overdue", 
          className: "bg-red-100 dark:bg-red-900", 
          statusText: "⚠️ Overdue",
          borderClass: "border-red-400 dark:border-red-700"
        };
      }
      
      // If task is today, check the time
      if (taskDate.getDate() === today.getDate() && 
          taskDate.getMonth() === today.getMonth() && 
          taskDate.getFullYear() === today.getFullYear()) {
        
        if (task.startTime && task.endTime) {
          const [startHour, startMinute] = task.startTime.split(':').map(Number);
          const [endHour, endMinute] = task.endTime.split(':').map(Number);
          
          const taskStartTime = new Date(today);
          taskStartTime.setHours(startHour, startMinute, 0);
          
          const taskEndTime = new Date(today);
          taskEndTime.setHours(endHour, endMinute, 0);
          
          // If current time is past end time, it's overdue
          if (now > taskEndTime) {
            return { 
              status: "Overdue", 
              className: "bg-red-100 dark:bg-red-900", 
              statusText: "⚠️ Overdue",
              borderClass: "border-red-400 dark:border-red-700"
            };
          }
          
          // If current time is between start and end time, it's in progress
          if (now >= taskStartTime && now <= taskEndTime) {
            return { 
              status: "In Progress", 
              className: "bg-green-100 dark:bg-green-900", 
              statusText: "⏳ In Progress",
              borderClass: "border-green-400 dark:border-green-700"
            };
          }
          
          // If current time is before start time but today, it's upcoming
          if (now < taskStartTime) {
            return { 
              status: "Upcoming", 
              className: task.isBlockedTime ? "bg-orange-100 dark:bg-orange-900" : "bg-blue-100 dark:bg-blue-900", 
              statusText: "🔜 Upcoming",
              borderClass: task.isBlockedTime ? "border-orange-400 dark:border-orange-700" : "border-blue-400 dark:border-blue-700"
            };
          }
        }
      }
      
      // Default for future dates
      return { 
        status: "Upcoming", 
        className: task.isBlockedTime ? "bg-orange-100 dark:bg-orange-900" : "bg-blue-100 dark:bg-blue-900", 
        statusText: "🔜 Upcoming",
        borderClass: task.isBlockedTime ? "border-orange-400 dark:border-orange-700" : "border-blue-400 dark:border-blue-700"
      };
    };

    const taskStatus = getTaskStatus();

    return (
      <div
        id={`calendar-task-${task.id}`}
        data-task-id={task.id}
        ref={preview}
        className={`absolute left-[70px] rounded-md px-2 py-1 ${taskStatus.className} ${isDragging ? "opacity-50 task-dragging" : ""} border ${taskStatus.borderClass} shadow-sm transition-all duration-300 task-tooltip-trigger`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          zIndex: isHovered || isEditing ? 50 : 1,
          width: "calc(100% - 90px)",
          minWidth: "300px",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tooltip showing detailed information */}
        <div className="task-tooltip calendar-task-tooltip" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-5px)', zIndex: 1000 }}>
          <div className="task-tooltip-content">
            <div className="font-semibold">{task.title}</div>
            <div className="text-xs opacity-80">
              <div>📅 {task.date ? new Date(task.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Unknown date"}</div>
              <div>⏰ {formatTimeForDisplay(task.startTime || "")} - {formatTimeForDisplay(task.endTime || "")}</div>
              <div>⏱️ Duration: {task.duration || 30} minutes</div>
              <div>📝 {task.assignmentTitle}</div>
              <div>Status: {taskStatus.statusText}</div>
            </div>
          </div>
          <div className="task-tooltip-arrow-down" style={{ left: '50%', transform: 'translateX(-50%)' }}></div>
        </div>
        
        {isEditing && (
          <div className="absolute inset-0 bg-black bg-opacity-20 rounded-md z-0"></div>
        )}
        <div className="flex items-start h-full relative z-10">
          <div ref={drag} className="cursor-move mr-1 mt-1 flex-shrink-0">
            <GripVertical className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          </div>

          <div className="flex-1 overflow-hidden relative">
            {isShortTask ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeForDisplay(task.startTime || "")} -{" "}
                    {formatTimeForDisplay(task.endTime || "")}
                  </p>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs p-0"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 -mr-1 ml-1"
                      onClick={() => onRemoveTask(task.id)}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-xs font-medium italic truncate ${task.completed ? "line-through text-gray-500 dark:text-gray-500" : "text-foreground"}`}
                    title={`${task.assignmentTitle}: ${task.title}`}
                  >
                    {task.title.length > 10 ? "..." : task.title}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] h-4 px-1 ml-1 ${
                      taskStatus.status === "Completed" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : 
                      taskStatus.status === "Overdue" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                      taskStatus.status === "In Progress" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {taskStatus.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeForDisplay(task.startTime || "")} -{" "}
                    {formatTimeForDisplay(task.endTime || "")}
                  </p>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-xs p-0"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 -mr-1 ml-1"
                      onClick={() => onRemoveTask(task.id)}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-xs font-medium italic truncate ${task.completed ? "line-through text-gray-500 dark:text-gray-500" : "text-foreground"}`}
                    title={`${task.assignmentTitle}: ${task.title}`}
                  >
                    {task.title}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] h-4 px-1 ml-1 ${
                      taskStatus.status === "Completed" ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : 
                      taskStatus.status === "Overdue" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                      taskStatus.status === "In Progress" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {taskStatus.status}
                  </Badge>
                </div>
              </>
            )}

            {isEditing && (
              <div className="mt-1 space-y-2 bg-white dark:bg-gray-800 bg-opacity-90 p-1 rounded">
                <div className="flex items-center space-x-1 flex-col">
                  <div className="flex items-center w-full mb-1">
                    <span className="text-xs mr-2">Duration:</span>
                    <div
                      className={`flex-1 ${checkForOverlap(task.startTime || "08:00", sliderValue, task.id, task.isBlockedTime) && sliderValue > (task.duration || 30) ? "bg-red-100 rounded p-1" : ""}`}
                    >
                      <Slider
                        value={[sliderValue]}
                        min={15}
                        max={240}
                        step={15}
                        className="flex-1"
                        onValueChange={(value) => {
                          const duration = value[0];
                          setSliderValue(duration);
                        }}
                        onValueCommit={(value) => {
                          const duration = value[0];

                          // Check if the new duration would cause an overlap (excluding the current task)
                          const wouldOverlap = checkForOverlap(
                            task.startTime || "08:00",
                            duration,
                            task.id,
                            task.isBlockedTime,
                          );

                          // If it would overlap, find the maximum duration that doesn't overlap
                          if (
                            wouldOverlap &&
                            duration > (task.duration || 30)
                          ) {
                            // Find the maximum duration that doesn't overlap
                            let maxDuration = task.duration || 30;
                            while (maxDuration < duration) {
                              if (
                                !checkForOverlap(
                                  task.startTime || "08:00",
                                  maxDuration + 15,
                                  task.id,
                                  task.isBlockedTime,
                                )
                              ) {
                                maxDuration += 15;
                              } else {
                                break;
                              }
                            }

                            // Use the maximum non-overlapping duration
                            onUpdateTaskTime(
                              task.id,
                              task.startTime || "08:00",
                              calculateEndTime(
                                task.startTime || "08:00",
                                maxDuration,
                              ),
                              maxDuration,
                            );
                            setSliderValue(maxDuration);
                          } else {
                            // No overlap or reducing duration, proceed normally
                            onUpdateTaskTime(
                              task.id,
                              task.startTime || "08:00",
                              calculateEndTime(
                                task.startTime || "08:00",
                                duration,
                              ),
                              duration,
                            );
                          }
                        }}
                      />
                      {checkForOverlap(
                        task.startTime || "08:00",
                        sliderValue,
                        task.id,
                        task.isBlockedTime,
                      ) &&
                        sliderValue > (task.duration || 30) && (
                          <div className="text-xs text-red-500 mt-1">
                            Overlap detected - will adjust automatically
                          </div>
                        )}
                    </div>
                    <span className="text-xs w-8 text-right ml-2">
                      {sliderValue}m
                    </span>
                  </div>

                  {/* Manual time selection */}
                  <div className="flex items-center w-full mb-1 mt-2">
                    <span className="text-xs mr-2">Time:</span>
                    <div className="flex-1 flex space-x-2">
                      <Select
                        value={task.startTime || "08:00"}
                        onValueChange={(value) => {
                          const newStartTime = value;
                          const newEndTime = calculateEndTime(
                            newStartTime,
                            sliderValue,
                          );

                          // Check for overlaps
                          if (
                            !checkForOverlap(newStartTime, sliderValue, task.id, task.isBlockedTime)
                          ) {
                            onUpdateTaskTime(
                              task.id,
                              newStartTime,
                              newEndTime,
                              sliderValue,
                            );
                          } else {
                            // Find next available slot
                            const nextAvailableSlot = findNextAvailableSlot(
                              newStartTime,
                              sliderValue,
                            );
                            onUpdateTaskTime(
                              task.id,
                              nextAvailableSlot,
                              calculateEndTime(nextAvailableSlot, sliderValue),
                              sliderValue,
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-full text-xs h-8">
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SELECTION_SLOTS.map((time) => (
                            <SelectItem
                              key={time}
                              value={time}
                              className="text-xs"
                            >
                              {formatTimeForDisplay(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-xs flex items-center">to</span>

                      <Select
                        value={
                          task.endTime ||
                          calculateEndTime(
                            task.startTime || "08:00",
                            sliderValue,
                          )
                        }
                        onValueChange={(value) => {
                          const newEndTime = value;
                          const startTime = task.startTime || "08:00";

                          // Calculate duration in minutes
                          const [startHour, startMinute] = startTime
                            .split(":")
                            .map(Number);
                          const [endHour, endMinute] = newEndTime
                            .split(":")
                            .map(Number);

                          const startMinutes = startHour * 60 + startMinute;
                          const endMinutes = endHour * 60 + endMinute;

                          // Ensure end time is after start time
                          if (endMinutes <= startMinutes) return;

                          const newDuration = endMinutes - startMinutes;

                          // Check for overlaps
                          if (
                            !checkForOverlap(startTime, newDuration, task.id, task.isBlockedTime)
                          ) {
                            onUpdateTaskTime(
                              task.id,
                              startTime,
                              newEndTime,
                              newDuration,
                            );
                            setSliderValue(newDuration);
                          } else {
                            // Find maximum non-overlapping duration
                            let maxDuration = task.duration || 30;
                            while (maxDuration < newDuration) {
                              if (
                                !checkForOverlap(
                                  startTime,
                                  maxDuration + 15,
                                  task.id,
                                  task.isBlockedTime,
                                )
                              ) {
                                maxDuration += 15;
                              } else {
                                break;
                              }
                            }

                            const adjustedEndTime = calculateEndTime(
                              startTime,
                              maxDuration,
                            );
                            onUpdateTaskTime(
                              task.id,
                              startTime,
                              adjustedEndTime,
                              maxDuration,
                            );
                            setSliderValue(maxDuration);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full text-xs h-8">
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SELECTION_SLOTS.filter((time) => {
                            // Only show times after the start time
                            const [startHour, startMinute] = (
                              task.startTime || "08:00"
                            )
                              .split(":")
                              .map(Number);
                            const [timeHour, timeMinute] = time
                              .split(":")
                              .map(Number);
                            return (
                              timeHour > startHour ||
                              (timeHour === startHour &&
                                timeMinute > startMinute)
                            );
                          }).map((time) => (
                            <SelectItem
                              key={time}
                              value={time}
                              className="text-xs"
                            >
                              {formatTimeForDisplay(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    className="mr-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setIsEditing(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Time slot drop zones
  const TimeSlot = ({ time, index }: { time: string; index: number }) => {
    const [{ isOver }, dropRef] = useDrop(() => ({
      accept: ["task", "calendar-task"],
      hover: () => {
        // Add visual feedback for the time slot being hovered over
        const allTimeSlots = document.querySelectorAll(".time-slot");
        allTimeSlots.forEach((slot) => {
          slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
        });

        const targetSlot = document.querySelector(`.time-slot-${index}`);
        if (targetSlot) {
          targetSlot.classList.add("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
        }
        
        // Update the placeholder position
        const placeholderTask = document.getElementById("calendar-task-placeholder");
        if (placeholderTask) {
          const top = index * 60;
          // Try to get the duration from the dragged item, or default to 30
          const draggedItems = document.querySelectorAll(".task-dragging");
          let duration = 30;
          if (draggedItems.length > 0) {
            const draggedItem = draggedItems[0] as HTMLElement;
            const draggedItemId = draggedItem.getAttribute("data-task-id");
            if (draggedItemId) {
              const task = calendarTasks.find(t => t.id === draggedItemId);
              if (task && task.duration) {
                duration = task.duration;
              }
            }
          }
          const height = (duration / 60) * 60;
          
          placeholderTask.style.top = `${top}px`;
          placeholderTask.style.height = `${height}px`;
          placeholderTask.style.display = "block";
        }
      },
      canDrop: (item, monitor) => {
        // Always allow dropping on time slots
        return true;
      },
      drop: (item: any) => {
        console.log("Item dropped on TimeSlot:", item, "Time slot:", time);
        
        // Use the task's duration or default to 30 minutes
        const duration = item.duration || 30;
        console.log("Task duration:", duration);

        // Check if the selected time slot would cause an overlap (excluding the task being moved)
        let finalTimeSlot = time;
        if (checkForOverlap(time, duration, item.id, item.isBlockedTime)) {
          // Find the next available time slot
          finalTimeSlot = findNextAvailableSlot(time, duration);
          console.log("Found next available time slot:", finalTimeSlot);
        }

        const endTime = calculateEndTime(finalTimeSlot, duration);
        console.log("Calculated end time:", endTime);

        // Check if this is a new task or an existing calendar task
        const existingTask = calendarTasks.find(t => t.id === item.id);
        const isNewTask = !existingTask;
        console.log("Is new task:", isNewTask);

        // Update the task time
        onUpdateTaskTime(item.id, finalTimeSlot, endTime, duration);
        console.log("Updated task time");

        // Add the task to the calendar if it's not already there
        if (isNewTask) {
          console.log("Adding new task to calendar");
          onAddTask({
            id: item.id,
            assignmentId: item.assignmentId || "",
            assignmentTitle: item.assignmentTitle || "",
            title: item.title,
            completed: item.completed,
            startTime: finalTimeSlot,
            endTime,
            duration,
            date: selectedDateISO,
          });
          console.log("Task added to calendar");
          
          // Dispatch an event to notify that a task has been added
          window.dispatchEvent(
            new CustomEvent("calendar-tasks-updated", {
              detail: { taskId: item.id },
            })
          );
        }

        // Clear any hover effects
        const allTimeSlots = document.querySelectorAll(".time-slot");
        allTimeSlots.forEach((slot) => {
          slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
        });
        
        // Hide the placeholder
        const placeholderTask = document.getElementById("calendar-task-placeholder");
        if (placeholderTask) {
          placeholderTask.style.display = "none";
        }
        
        return { name: "TimeSlot", success: true };
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }));

    return (
      <div
        id={`time-slot-${index}`}
        ref={dropRef}
        className={`time-slot time-slot-${index} absolute w-full border-b border-gray-200 dark:border-gray-700 ${isOver ? "drop-active" : ""}`}
        style={{
          top: `${index * 60}px`,
          height: "60px",
          left: 0,
          right: 0,
          backgroundColor: isOver ? "rgba(59, 130, 246, 0.1)" : "transparent",
        }}
      >
        <div className="absolute left-0 text-xs text-gray-500 dark:text-gray-400 -translate-y-1/2">
          {formatTimeForDisplay(time)}
        </div>
      </div>
    );
  };

  // Clean up any UI elements when the component unmounts
  useEffect(() => {
    const handleDragEnd = () => {
      // Hide the placeholder
      const placeholderTask = document.getElementById("calendar-task-placeholder");
      if (placeholderTask) {
        placeholderTask.style.display = "none";
      }
      
      // Clear any hover effects
      const allTimeSlots = document.querySelectorAll(".time-slot");
      allTimeSlots.forEach((slot) => {
        slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
      });
    };
    
    // Add event listener for drag end
    window.addEventListener("dragend", handleDragEnd);
    
    return () => {
      // Clean up event listener
      window.removeEventListener("dragend", handleDragEnd);
      
      // Hide the placeholder
      const placeholderTask = document.getElementById("calendar-task-placeholder");
      if (placeholderTask) {
        placeholderTask.style.display = "none";
      }
      
      // Clear any hover effects
      const allTimeSlots = document.querySelectorAll(".time-slot");
      allTimeSlots.forEach((slot) => {
        slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30", "drop-active");
      });
    };
  }, []);

  return (
    <Card
      className={`${isEmbedded ? "w-full h-full shadow-none border-0" : "w-[500px]"} bg-card text-card-foreground ${!isEmbedded ? "shadow-lg" : ""} ${isOver ? "ring-2 ring-primary" : ""} calendar-panel`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!hideScheduleHeader && (
              <>
                <CalendarIcon className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-lg">Schedule</CardTitle>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="ml-2 text-xs h-7 px-2"
              onClick={toggleTimeFormat}
            >
              {timeFormat === "12h" ? "24h" : "12h"}
            </Button>
            <Badge variant="secondary" className="ml-2">
              {filteredTasks.length} tasks
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="ml-2 text-xs h-7 px-2"
              onClick={() => setShowBlockTimeDialog(true)}
            >
              Block Time
            </Button>
          </div>
          {!hideViewMonthButton && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMonthView(!showMonthView)}
              >
                {showMonthView ? "View Day" : "View Month"}
              </Button>
            </div>
          )}
        </div>
        {showMonthView ? (
          <div className="flex items-center justify-between mt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue>
                    {new Date(selectedYear, selectedMonth).toLocaleString(
                      "default",
                      { month: "long" },
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {new Date(2000, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue>{selectedYear}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 5 + i;
                    return (
                      <SelectItem key={i} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardDescription>{formattedDate}</CardDescription>
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {showMonthView ? (
          <div className="h-[500px]">
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 h-[450px]">
              {(() => {
                const daysInMonth = new Date(
                  selectedYear,
                  selectedMonth + 1,
                  0,
                ).getDate();
                const firstDayOfMonth = new Date(
                  selectedYear,
                  selectedMonth,
                  1,
                ).getDay();

                // Create array for all days in the month view
                const days = [];

                // Add empty cells for days before the first day of the month
                for (let i = 0; i < firstDayOfMonth; i++) {
                  days.push(
                    <div key={`empty-${i}`} className="p-1 h-[60px]"></div>,
                  );
                }

                // Add cells for each day of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(selectedYear, selectedMonth, day);
                  // Format date as ISO string and extract the date part (YYYY-MM-DD)
                  const dateISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  
                  const isToday = dateISO === (() => {
                    const today = new Date();
                    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                  })();
                  
                  const isSelected = dateISO === selectedDateISO;
                  const tasksForDay = calendarTasks.filter(
                    (task) => task.date === dateISO,
                  );

                  days.push(
                    <div
                      key={`day-${day}`}
                      className={`p-1 border rounded-md h-[60px] overflow-hidden ${isSelected ? "bg-blue-50 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700" : isToday ? "bg-gray-50 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"}`}
                      onClick={() => {
                        setInternalSelectedDate(date);
                        setShowMonthView(false);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-sm ${isSelected ? "font-bold text-primary" : isToday ? "font-semibold" : ""}`}
                        >
                          {day}
                        </span>
                        {tasksForDay.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs text-blue-500 dark:text-blue-400 font-bold"
                          >
                            {tasksForDay.length}
                          </Badge>
                        )}
                      </div>
                    </div>,
                  );
                }

                return days;
              })()}
            </div>
          </div>
        ) : (
          <ScrollArea
            className="h-[500px]"
            scrollHideDelay={400}
          >
            <div
              className="relative border-l border-gray-200 dark:border-gray-700 ml-[60px] bg-white dark:bg-gray-900"
              style={{ minWidth: "300px" }}
            >
              <div
                ref={(node) => {
                  // Apply ref to the element
                  calendarGridRef.current = node;
                  drop(node);
                }}
                className="relative"
                style={{
                  minHeight: `${TIME_SLOTS.length * 60}px`,
                  minWidth: "400px",
                }}
              >
                {/* Time slots - hourly intervals */}
                {TIME_SLOTS.map((time, index) => (
                  <TimeSlot key={time} time={time} index={index} />
                ))}

                {/* Placeholder for task being dragged */}
                <div
                  id="calendar-task-placeholder"
                  className="calendar-task-placeholder absolute left-[70px] w-[calc(100%-90px)] hidden"
                  style={{ zIndex: 5, pointerEvents: "none" }}
                ></div>

                {/* Current time indicator - only show for today */}
                {selectedDateISO ===
                  (() => {
                    const today = new Date();
                    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                  })() && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-red-400 border-dashed z-20 current-time-indicator"
                    style={{
                      top: `${calculateTaskPosition(`${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`)}px`,
                      width: "calc(100% + 100px)",
                    }}
                    id="current-time-indicator"
                  >
                    <div className="absolute -top-2 -left-[60px] text-xs text-red-500 font-medium">
                      {formatTimeForDisplay(
                        `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`,
                      )}
                    </div>
                    <div className="absolute -top-2 left-1 h-4 w-4 rounded-full bg-red-400"></div>
                  </div>
                )}

                {/* Tasks positioned absolutely */}
                {filteredTasks.map((task) => (
                  <CalendarTaskItem key={task.id} task={task} />
                ))}

                {filteredTasks.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
                    <CalendarIcon className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">Drag tasks here to schedule them</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Block Time Dialog */}
      <BlockTimeDialog
        open={showBlockTimeDialog}
        onOpenChange={setShowBlockTimeDialog}
        onAddBlockedTime={onAddTask}
      />
    </Card>
  );
};

export default CalendarPanel;
