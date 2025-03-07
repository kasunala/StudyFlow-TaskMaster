import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Repeat } from "lucide-react";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarTask, useCalendar } from "@/contexts/CalendarContext";
import { Checkbox } from "@/components/ui/checkbox";
import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";
import { checkTimeOverlap, calculateEndTime } from "@/utils/calendarUtils";

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBlockedTime: (task: CalendarTask) => void;
}

type RecurrenceType = "daily" | "weekly";
type WeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

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

// Calculate end time based on start time and duration is now imported from calendarUtils

// Get day of week from date string
const getDayOfWeek = (dateString: string): WeekDay => {
  const date = new Date(dateString);
  const days: WeekDay[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getDay()];
};

// Generate dates between start and end date based on recurrence pattern
const generateRecurringDates = (
  startDate: string,
  endDate: string,
  recurrenceType: RecurrenceType,
  selectedDays: WeekDay[] = [],
): string[] => {
  console.log("generateRecurringDates called with:", { startDate, endDate, recurrenceType, selectedDays });
  
  // Always return at least the start date
  const dates: string[] = [startDate];
  
  // If not recurring or no valid recurrence type, just return the start date
  if (!recurrenceType) {
    console.log("No recurrence type provided, returning single date:", startDate);
    return dates;
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  // For recurring events, add additional dates
  if (recurrenceType === "daily" || recurrenceType === "weekly") {
    let current = addDays(start, 1); // Start from the next day

    while (isBefore(current, end) || format(current, "yyyy-MM-dd") === endDate) {
      const currentDateStr = format(current, "yyyy-MM-dd");
      const dayOfWeek = getDayOfWeek(currentDateStr);

      if (
        recurrenceType === "daily" ||
        (recurrenceType === "weekly" && selectedDays.includes(dayOfWeek))
      ) {
        dates.push(currentDateStr);
      }

      current = addDays(current, 1);
    }
  }

  console.log("Generated dates:", dates);
  return dates;
};

const TIME_SELECTION_SLOTS = generateTimeSelectionSlots();

const BlockTimeDialog = ({
  open,
  onOpenChange,
  onAddBlockedTime,
}: BlockTimeDialogProps) => {
  const { formatTime } = useTimeFormat();
  const [title, setTitle] = useState("Blocked Time");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [endTime, setEndTime] = useState(calculateEndTime(startTime, duration));

  // Recurrence settings
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("daily");
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [selectedDays, setSelectedDays] = useState<WeekDay[]>([]);

  const { calendarTasks } = useCalendar();

  // Initialize selected days based on start date
  React.useEffect(() => {
    if (date) {
      const dayOfWeek = getDayOfWeek(date);
      setSelectedDays([dayOfWeek]);
    }
  }, [date]);

  // Update end time when start time or duration changes
  React.useEffect(() => {
    setEndTime(calculateEndTime(startTime, duration));
  }, [startTime, duration]);

  // Update duration when end time changes
  const handleEndTimeChange = (newEndTime: string) => {
    setEndTime(newEndTime);

    // Calculate new duration
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = newEndTime.split(":").map(Number);

    let startTotalMinutes = startHour * 60 + startMinute;
    let endTotalMinutes = endHour * 60 + endMinute;

    // Handle case where end time is on the next day
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60; // Add 24 hours
    }

    const newDuration = endTotalMinutes - startTotalMinutes;
    setDuration(newDuration);
  };

  const handleDayToggle = (day: WeekDay) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleSubmit = async () => {
    if (!title || !date || !startTime || !endTime) {
      console.log("Missing required fields:", { title, date, startTime, endTime });
      return;
    }

    console.log("Submitting blocked time:", {
      isRecurring,
      recurrenceType,
      date,
      endDate,
      selectedDays,
    });

    // For recurring events, generate all dates
    const dates = isRecurring
      ? generateRecurringDates(
          date,
          endDate,
          recurrenceType,
          recurrenceType === "weekly" ? selectedDays : [],
        )
      : [date];

    console.log("Dates to create blocked time for:", dates);

    // Calculate duration in minutes
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;
    
    // Handle case where end time is on the next day
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }
    
    const calculatedDuration = endMinutes - startMinutes;

    // Create a blocked time task for each date
    const addPromises = dates.map(async (dateStr, index) => {
      // Get tasks for this specific date
      const tasksForDate = calendarTasks.filter(task => task.date === dateStr);
      
      // Skip dates where there would be an overlap
      if (checkTimeOverlap(startTime, calculatedDuration, tasksForDate, undefined, true)) {
        console.log(`Skipping blocked time for ${dateStr} due to overlap`);
        return null;
      }

      const blockedTimeTask: CalendarTask = {
        id: `blocked-time-${Date.now()}-${index}`,
        title: isRecurring
          ? `${title} (${format(new Date(dateStr), "EEE")})`
          : title,
        completed: false,
        assignmentId: "blocked-time",
        assignmentTitle: "Blocked Time",
        startTime,
        endTime,
        duration: calculatedDuration,
        date: dateStr,
        isBlockedTime: true,
        isRecurring: isRecurring,
        // Use null instead of undefined for Firestore compatibility
        recurrenceType: isRecurring ? recurrenceType : null,
      };

      console.log("Creating blocked time task:", blockedTimeTask);
      await onAddBlockedTime(blockedTimeTask);
      return blockedTimeTask;
    });

    // Wait for all tasks to be added
    const results = await Promise.all(addPromises);
    
    // Check if any blocked times were skipped due to overlaps
    const skippedDates = results.filter(result => result === null).length;
    if (skippedDates > 0) {
      console.log(`${skippedDates} blocked times were skipped due to overlaps`);
      // You could show a notification to the user here
    }
    
    // Force a refresh of the calendar by dispatching a custom event
    window.dispatchEvent(new CustomEvent('calendar-tasks-updated'));
    
    // Close the dialog
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Block Time</DialogTitle>
          <DialogDescription>
            Reserve time on your calendar for other activities.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Meeting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <div className="flex">
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="ml-2"
                type="button"
                onClick={() => {
                  // Create a date picker element
                  const datePicker = document.createElement("input");
                  datePicker.type = "date";
                  datePicker.style.display = "none";
                  document.body.appendChild(datePicker);

                  // Set initial value if available
                  if (date) {
                    datePicker.value = date;
                  }

                  // Handle date selection
                  datePicker.addEventListener("change", () => {
                    setDate(datePicker.value);
                    document.body.removeChild(datePicker);
                  });

                  // Open the date picker
                  datePicker.click();

                  // Clean up if dialog is closed without selecting
                  datePicker.addEventListener("blur", () => {
                    if (document.body.contains(datePicker)) {
                      document.body.removeChild(datePicker);
                    }
                  });
                }}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Time Range</Label>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 flex-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SELECTION_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span>to</span>

                <Select value={endTime} onValueChange={handleEndTimeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SELECTION_SLOTS.filter((time) => {
                      // Only show times after the start time
                      const [startHour, startMinute] = startTime
                        .split(":")
                        .map(Number);
                      const [timeHour, timeMinute] = time
                        .split(":")
                        .map(Number);
                      return (
                        timeHour > startHour ||
                        (timeHour === startHour && timeMinute > startMinute)
                      );
                    }).map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Duration: {duration} minutes
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <Label
                htmlFor="recurring"
                className="flex items-center cursor-pointer"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Recurring
              </Label>
            </div>

            {isRecurring && (
              <div className="pl-6 space-y-4 mt-2 border-l-2 border-muted">
                <div className="grid gap-2">
                  <Label htmlFor="recurrenceType">Recurrence Pattern</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={(value: RecurrenceType) =>
                      setRecurrenceType(value)
                    }
                  >
                    <SelectTrigger id="recurrenceType">
                      <SelectValue placeholder="Select recurrence pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === "weekly" && (
                  <div className="grid gap-2">
                    <Label>Repeat on</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { day: "monday", label: "M" },
                        { day: "tuesday", label: "T" },
                        { day: "wednesday", label: "W" },
                        { day: "thursday", label: "T" },
                        { day: "friday", label: "F" },
                        { day: "saturday", label: "S" },
                        { day: "sunday", label: "S" },
                      ].map(({ day, label }) => (
                        <Button
                          key={day}
                          type="button"
                          variant={
                            selectedDays.includes(day as WeekDay)
                              ? "default"
                              : "outline"
                          }
                          className="w-8 h-8 p-0 rounded-full"
                          onClick={() => handleDayToggle(day as WeekDay)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <div className="flex">
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      min={date} // Can't end before it starts
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="ml-2"
                      type="button"
                      onClick={() => {
                        const datePicker = document.createElement("input");
                        datePicker.type = "date";
                        datePicker.min = date;
                        datePicker.style.display = "none";
                        document.body.appendChild(datePicker);

                        if (endDate) {
                          datePicker.value = endDate;
                        }

                        datePicker.addEventListener("change", () => {
                          setEndDate(datePicker.value);
                          document.body.removeChild(datePicker);
                        });

                        datePicker.click();

                        datePicker.addEventListener("blur", () => {
                          if (document.body.contains(datePicker)) {
                            document.body.removeChild(datePicker);
                          }
                        });
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isRecurring && recurrenceType && endDate && (
                  <div className="text-sm text-muted-foreground">
                    {recurrenceType === "daily" ? (
                      <span>
                        Occurs every day from{" "}
                        {format(parseISO(date), "MMM d, yyyy")} to{" "}
                        {format(parseISO(endDate), "MMM d, yyyy")}
                      </span>
                    ) : (
                      <span>
                        Occurs every{" "}
                        {selectedDays
                          .map(
                            (day) => day.charAt(0).toUpperCase() + day.slice(1),
                          )
                          .join(", ")}
                        from {format(parseISO(date), "MMM d, yyyy")} to{" "}
                        {format(parseISO(endDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={
              !title ||
              !date ||
              !startTime ||
              !endTime ||
              (isRecurring && !endDate) ||
              (isRecurring &&
                recurrenceType === "weekly" &&
                selectedDays.length === 0)
            }
          >
            {isRecurring ? "Block Recurring Time" : "Block Time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeDialog;
