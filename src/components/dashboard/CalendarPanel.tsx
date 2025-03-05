import React, { useState, useRef, useEffect } from "react";
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
  assignmentId?: string;
  assignmentTitle?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

interface CalendarTask extends Task {
  assignmentId: string;
  assignmentTitle: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  date?: string; // ISO date string format YYYY-MM-DD
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
}

// Generate time slots from 8:00 AM to 10:00 PM in 60-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    const hourFormatted = hour.toString().padStart(2, "0");
    slots.push(`${hourFormatted}:00`);
  }
  // Add one final slot to show the end time
  slots.push("23:00");
  return slots;
};

// Format time for display (convert from 24h to 12h format)
const formatTimeForDisplay = (time: string) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr);
  const minute = minuteStr;
  const amPm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${amPm}`;
};

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

// Calculate the top position for a task based on its start time
const calculateTaskPosition = (startTime: string): number => {
  if (!startTime) return 0;
  const [hourStr, minuteStr] = startTime.split(":");
  const [hour, minute] = [parseInt(hourStr), parseInt(minuteStr)];

  // Each hour is 60px tall, starting from 8:00 AM (0px)
  const minutesSince8AM = (hour - 8) * 60 + minute;
  return (minutesSince8AM / 60) * 60; // 60px per hour
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
}: CalendarPanelProps) => {
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleTimeSlots, setVisibleTimeSlots] = useState(TIME_SLOTS);
  const [showMonthView, setShowMonthView] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Reference to the calendar grid for position calculations
  const calendarGridRef = useRef<HTMLDivElement>(null);

  // Format selected date as ISO string (YYYY-MM-DD)
  const selectedDateISO = selectedDate.toISOString().split("T")[0];

  // Filter tasks for the selected date
  const filteredTasks = calendarTasks.filter((task) => {
    // If task has no date, assign it today's date for the demo
    if (!task.date) {
      task.date = new Date().toISOString().split("T")[0];
    }
    return task.date === selectedDateISO;
  });

  // Drop handler for the entire calendar
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
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
    },
    drop: (
      item: Task & { assignmentId: string; assignmentTitle: string },
      monitor,
    ) => {
      if (!calendarGridRef.current || !hoveredTimeSlot) return;

      // Calculate end time (default 30 min duration)
      const endTime = calculateEndTime(hoveredTimeSlot, 30);

      onAddTask({
        ...item,
        assignmentId: item.assignmentId,
        assignmentTitle: item.assignmentTitle,
        startTime: hoveredTimeSlot,
        endTime: endTime,
        duration: 30,
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
  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Navigate to previous day
  const goToPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  // Create a task component that can be dragged within the calendar
  const CalendarTaskItem = ({ task }: { task: CalendarTask }) => {
    const [{ isDragging }, drag, preview] = useDrag(() => ({
      type: "calendar-task",
      item: { id: task.id },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }));

    const [isEditing, setIsEditing] = useState(false);

    const top = calculateTaskPosition(task.startTime || "08:00");
    const height = calculateTaskHeight(task.duration || 30);

    return (
      <div
        ref={preview}
        className={`absolute left-[60px] right-4 rounded-md px-2 py-1 ${task.completed ? "bg-gray-100" : "bg-blue-100"} ${isDragging ? "opacity-50" : ""} border border-gray-300 shadow-sm`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          zIndex: isEditing ? 10 : 1,
        }}
      >
        <div className="flex items-start h-full">
          <div ref={drag} className="cursor-move mr-1 mt-1 flex-shrink-0">
            <GripVertical className="h-3 w-3 text-gray-500" />
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h4
                className={`text-xs font-medium truncate ${task.completed ? "line-through text-gray-500" : ""}`}
              >
                {task.title}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 -mr-1"
                onClick={() => onRemoveTask(task.id)}
              >
                <span className="text-xs">×</span>
              </Button>
            </div>

            <p className="text-xs text-gray-500 truncate">
              {formatTimeForDisplay(task.startTime || "")} -{" "}
              {formatTimeForDisplay(task.endTime || "")}
            </p>

            {isEditing && (
              <div className="mt-1 space-y-2">
                <div className="flex items-center space-x-1">
                  <span className="text-xs">Duration:</span>
                  <Slider
                    value={[task.duration || 30]}
                    min={15}
                    max={120}
                    step={15}
                    className="flex-1"
                    onValueChange={(value) => {
                      const duration = value[0];
                      onUpdateTaskTime(
                        task.id,
                        task.startTime || "08:00",
                        calculateEndTime(task.startTime || "08:00", duration),
                        duration,
                      );
                    }}
                  />
                  <span className="text-xs w-8 text-right">
                    {task.duration}m
                  </span>
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

            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-5 text-xs p-0"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Time slot drop zones
  const TimeSlot = ({ time }: { time: string }) => {
    const [{ isOver }, dropRef] = useDrop(() => ({
      accept: "task",
      drop: (
        item: Task & { assignmentId: string; assignmentTitle: string },
      ) => {
        // Calculate end time (default 30 min duration)
        const endTime = calculateEndTime(time, 30);

        onAddTask({
          ...item,
          assignmentId: item.assignmentId,
          assignmentTitle: item.assignmentTitle,
          startTime: time,
          endTime: endTime,
          duration: 30,
          date: selectedDateISO,
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
        className={`h-[60px] border-t border-gray-200 relative ${isOver ? "bg-blue-50" : ""}`}
      >
        <div className="absolute left-0 top-[-10px] text-xs text-gray-500 w-[50px] text-right pr-2">
          {formatTimeForDisplay(time)}
        </div>
        {/* Add a visible horizontal line for each time slot */}
        <div className="absolute left-0 right-0 border-t border-gray-200 top-0"></div>
      </div>
    );
  };

  return (
    <Card
      className={`w-[500px] bg-white shadow-lg ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">Schedule</CardTitle>
            <Badge variant="secondary" className="ml-2">
              {filteredTasks.length} tasks
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMonthView(!showMonthView)}
          >
            {showMonthView ? "View Day" : "View Month"}
          </Button>
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
                        setSelectedDate(date);
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
                          <Badge variant="secondary" className="text-xs">
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
          >
            <div
              ref={drop}
              className="relative border-l border-gray-200 ml-[50px] bg-white"
            >
              <div
                ref={calendarGridRef}
                className="relative"
                style={{ minHeight: `${TIME_SLOTS.length * 60}px` }}
              >
                {/* Time slots */}
                {TIME_SLOTS.map((time) => (
                  <TimeSlot key={time} time={time} />
                ))}

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
    </Card>
  );
};

export default CalendarPanel;
