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

// Calculate end time based on start time and duration
const calculateEndTime = (
  startTime: string,
  durationMinutes: number,
): string => {
  if (!startTime) return "";
  const [hourStr, minuteStr] = startTime.split(":");
  const [hour, minute] = [parseInt(hourStr), parseInt(minuteStr)];

  let totalMinutes = hour * 60 + minute + durationMinutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;

  return `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`;
};

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
        void timeIndicator.offsetHeight;
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
    const handleFocusTask = (event: any) => {
      console.log("Focus calendar task event received", event.detail);
      const { taskId } = event.detail;

      // Find the task in calendar tasks
      const task = calendarTasks.find((task) => task.id === taskId);
      console.log("Found task:", task);

      if (task) {
        // Set the selected date to the task's date
        if (task.date) {
          // Create a new Date object from the ISO string
          const taskDate = new Date(task.date);
          console.log("Setting calendar to date:", taskDate);

          // Update the month and year state variables to match the task date
          setSelectedMonth(taskDate.getMonth());
          setSelectedYear(taskDate.getFullYear());
          setInternalSelectedDate(taskDate);
        }

        // Make sure we're in day view
        setShowMonthView(false);

        // Use a longer delay to ensure the DOM has updated
        setTimeout(() => {
          // Try to find the task element
          const taskElement = document.getElementById(
            `calendar-task-${taskId}`,
          );
          console.log("Task element found:", taskElement);

          if (taskElement) {
            // Force a reflow
            void taskElement.offsetHeight;

            // Add highlight class
            taskElement.classList.add("highlight-task");
            console.log("Added highlight class to element");

            // Scroll the task into view
            taskElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            console.log("Scrolled element into view");

            // Remove highlight after 3 seconds
            setTimeout(() => {
              taskElement.classList.remove("highlight-task");
            }, 3000);
          } else {
            console.error("Task element not found in DOM for ID:", taskId);

            // If element not found, try again with a longer delay
            setTimeout(() => {
              const retryTaskElement = document.getElementById(
                `calendar-task-${taskId}`,
              );
              console.log("Retry task element found:", retryTaskElement);

              if (retryTaskElement) {
                // Force a reflow
                void retryTaskElement.offsetHeight;

                // Add highlight class
                retryTaskElement.classList.add("highlight-task");
                console.log("Added highlight class to element (retry)");

                // Scroll the task into view
                retryTaskElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                console.log("Scrolled element into view (retry)");

                // Remove highlight after 3 seconds
                setTimeout(() => {
                  retryTaskElement.classList.remove("highlight-task");
                }, 3000);
              } else {
                console.error(
                  "Task element still not found after retry for ID:",
                  taskId,
                );
              }
            }, 500);
          }
        }, 300); // Increased delay to ensure DOM is ready
      } else {
        console.error("Task not found in calendar tasks for ID:", taskId);
      }
    };

    // Use a direct function reference for the event listener
    window.addEventListener("focus-calendar-task", handleFocusTask);

    return () => {
      window.removeEventListener("focus-calendar-task", handleFocusTask);
    };
  }, [calendarTasks]);

  // Filter tasks for the selected date
  const filteredTasks = calendarTasks.filter((task) => {
    // If task has no date, assign it today's date for the demo using local timezone
    if (!task.date) {
      const today = new Date();
      task.date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    return task.date === selectedDateISO;
  });

  // Check if a new task would overlap with existing tasks
  const checkForOverlap = (
    startTime: string,
    duration: number,
    taskIdToExclude?: string,
  ): boolean => {
    // Only check tasks for the selected date
    const tasksForDay = taskIdToExclude
      ? filteredTasks.filter((task) => task.id !== taskIdToExclude)
      : filteredTasks;

    // Convert the new task's start and end times to minutes since midnight
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = startMinutes + duration;

    // Check against each existing task
    for (const task of tasksForDay) {
      if (!task.startTime) continue;

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

  // Find the next available time slot after a given time
  const findNextAvailableSlot = (
    startTime: string,
    duration: number,
  ): string => {
    // Start with the given time
    let [hour, minute] = startTime.split(":").map(Number);
    let currentMinutes = hour * 60 + minute;

    // Try each possible time slot in 30-minute increments
    while (currentMinutes < 23 * 60) {
      // Until 11:00 PM
      const currentTimeString = `${Math.floor(currentMinutes / 60)
        .toString()
        .padStart(
          2,
          "0",
        )}:${(currentMinutes % 60).toString().padStart(2, "0")}`;

      if (!checkForOverlap(currentTimeString, duration)) {
        return currentTimeString;
      }

      // Move to next 30-minute slot
      currentMinutes += 30;
    }

    // If no slot is found, return the original time (this should be rare)
    return startTime;
  };

  // Drop handler for the entire calendar
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["task", "calendar-task"],
    hover: (item, monitor) => {
      if (!calendarGridRef.current) return;

      // Get mouse position relative to the calendar
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const calendarRect = calendarGridRef.current.getBoundingClientRect();
      const y = clientOffset.y - calendarRect.top;

      // Calculate which time slot the mouse is hovering over
      // Each hour is 60px tall, starting from 8:00 AM
      const hoursSince8AM = y / 60;
      const hour = Math.floor(hoursSince8AM) + 8;
      const minute = Math.floor((hoursSince8AM % 1) * 60);
      const minuteRounded = minute < 30 ? 0 : 30;

      const timeSlot = `${hour.toString().padStart(2, "0")}:${minuteRounded.toString().padStart(2, "0")}`;
      setHoveredTimeSlot(timeSlot);

      // Add visual feedback for the time slot being hovered over
      const allTimeSlots = document.querySelectorAll(".time-slot");
      allTimeSlots.forEach((slot) => {
        slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30");
      });

      const targetHour = Math.floor(hoursSince8AM);
      const targetSlot = document.querySelector(`.time-slot-${targetHour}`);
      if (targetSlot) {
        targetSlot.classList.add("bg-blue-50", "dark:bg-blue-900/30");
      }
    },

    drop: (
      item: Task & { assignmentId: string; assignmentTitle: string },
      monitor,
    ) => {
      if (!calendarGridRef.current || !hoveredTimeSlot) return;

      const duration = item.duration || 30; // Use task's duration or default to 30 minutes

      // Check if the selected time slot would cause an overlap
      let finalTimeSlot = hoveredTimeSlot;
      if (checkForOverlap(hoveredTimeSlot, duration)) {
        // Find the next available time slot
        finalTimeSlot = findNextAvailableSlot(hoveredTimeSlot, duration);
      }

      // Calculate end time based on the final time slot
      const endTime = calculateEndTime(finalTimeSlot, duration);

      onAddTask({
        ...item,
        assignmentId: item.assignmentId,
        assignmentTitle: item.assignmentTitle,
        startTime: finalTimeSlot,
        endTime: endTime,
        duration: duration,
        date: selectedDateISO,
      });

      setHoveredTimeSlot(null);
      return { name: "CalendarPanel" };
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
      },
      end: (item, monitor) => {
        // Reset any UI state when drag ends
        if (!monitor.didDrop()) {
          // If not dropped on a valid target
          console.log("Drag ended without valid drop");
        }
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }));

    const [isEditing, setIsEditing] = useState(false);
    const [sliderValue, setSliderValue] = useState(task.duration || 30);

    const top = calculateTaskPosition(task.startTime || "08:00");
    const height = calculateTaskHeight(task.duration || 30);
    const isShortTask = (task.duration || 30) < 30;

    return (
      <div
        id={`calendar-task-${task.id}`}
        ref={preview}
        className={`absolute left-[70px] rounded-md px-2 py-1 ${task.completed ? "bg-gray-100 dark:bg-gray-700" : task.isBlockedTime ? "bg-orange-100 dark:bg-orange-900" : "bg-blue-100 dark:bg-blue-900"} ${isDragging ? "opacity-50" : ""} border border-gray-300 dark:border-gray-600 shadow-sm transition-all duration-300`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          zIndex: isEditing ? 10 : 1,
          width: "calc(100% - 90px)",
          minWidth: "300px",
        }}
        title={`${task.assignmentTitle}: ${task.title} (${formatTimeForDisplay(task.startTime || "")} - ${formatTimeForDisplay(task.endTime || "")})`}
      >
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
                <div>
                  <h4
                    className={`text-xs font-medium italic truncate ${task.completed ? "line-through text-gray-500 dark:text-gray-500" : "text-foreground"}`}
                    title={`${task.assignmentTitle}: ${task.title}`}
                  >
                    {task.title.length > 10 ? "..." : task.title}
                  </h4>
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
                <h4
                  className={`text-xs font-medium italic truncate ${task.completed ? "line-through text-gray-500 dark:text-gray-500" : "text-foreground"}`}
                  title={`${task.assignmentTitle}: ${task.title}`}
                >
                  {task.title}
                </h4>
              </>
            )}

            {isEditing && (
              <div className="mt-1 space-y-2 bg-white dark:bg-gray-800 bg-opacity-90 p-1 rounded">
                <div className="flex items-center space-x-1 flex-col">
                  <div className="flex items-center w-full mb-1">
                    <span className="text-xs mr-2">Duration:</span>
                    <div
                      className={`flex-1 ${checkForOverlap(task.startTime || "08:00", sliderValue, task.id) && sliderValue > (task.duration || 30) ? "bg-red-100 rounded p-1" : ""}`}
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
                            !checkForOverlap(newStartTime, sliderValue, task.id)
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
                            !checkForOverlap(startTime, newDuration, task.id)
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
          slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30");
        });

        const targetSlot = document.querySelector(`.time-slot-${index}`);
        if (targetSlot) {
          targetSlot.classList.add("bg-blue-50", "dark:bg-blue-900/30");
        }
      },
      drop: (item: any) => {
        // Use the task's duration or default to 30 minutes
        const duration = item.duration || 30;

        // Check if the selected time slot would cause an overlap (excluding the task being moved)
        let finalTimeSlot = time;
        if (checkForOverlap(time, duration, item.id)) {
          // Find the next available time slot
          finalTimeSlot = findNextAvailableSlot(time, duration);
        }

        const endTime = calculateEndTime(finalTimeSlot, duration);

        // If it's a calendar task being moved, use its existing properties
        if (item.startTime) {
          onUpdateTaskTime(item.id, finalTimeSlot, endTime, duration);
        } else {
          // It's a new task being added from assignments
          onAddTask({
            ...item,
            assignmentId: item.assignmentId,
            assignmentTitle: item.assignmentTitle,
            startTime: finalTimeSlot,
            endTime: endTime,
            duration: duration,
            date: selectedDateISO,
          });
        }

        // Remove hover effect after drop
        const allTimeSlots = document.querySelectorAll(".time-slot");
        allTimeSlots.forEach((slot) => {
          slot.classList.remove("bg-blue-50", "dark:bg-blue-900/30");
        });

        return { name: "TimeSlot" };
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }));

    return (
      <div
        ref={dropRef}
        className={`time-slot time-slot-${index} h-[60px] border-t border-gray-200 dark:border-gray-700 relative ${isOver ? "bg-blue-50 dark:bg-blue-900/30" : ""} transition-colors duration-150`}
      >
        <div className="absolute left-0 top-[-10px] text-xs text-gray-500 dark:text-gray-400 w-[60px] text-right pr-2">
          {formatTimeForDisplay(time)}
        </div>
        {/* Add a visible horizontal line for each time slot */}
        <div className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700 top-0"></div>
      </div>
    );
  };

  return (
    <Card
      className={`${isEmbedded ? "w-full h-full shadow-none border-0" : "w-[500px]"} bg-card text-card-foreground ${!isEmbedded ? "shadow-lg" : ""} ${isOver ? "ring-2 ring-primary" : ""}`}
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
                  const dateISO = date.toISOString().split("T")[0];
                  const isSelected = dateISO === selectedDateISO;
                  const tasksForDay = calendarTasks.filter(
                    (task) => task.date === dateISO,
                  );

                  days.push(
                    <div
                      key={`day-${day}`}
                      className={`p-1 border rounded-md h-[60px] overflow-hidden ${isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"}`}
                      onClick={() => {
                        setInternalSelectedDate(date);
                        setShowMonthView(false);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-sm ${isSelected ? "font-bold" : ""}`}
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
                      {tasksForDay.length > 0 && (
                        <div className="mt-1 text-xs truncate">
                          {tasksForDay[0].title}
                          {tasksForDay.length > 1 && (
                            <span className="text-gray-500">
                              {" "}
                              +{tasksForDay.length - 1} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>,
                  );
                }

                return days;
              })()}
            </div>
          </div>
        ) : (
          <ScrollArea
            className="h-[500px] pr-4 overflow-visible"
            scrollHideDelay={0}
            orientation="both"
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
