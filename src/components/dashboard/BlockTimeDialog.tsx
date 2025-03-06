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
import { CalendarTask } from "@/contexts/CalendarContext";
import { Checkbox } from "@/components/ui/checkbox";
import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBlockedTime: (task: CalendarTask) => void;
}

type RecurrenceType = "none" | "daily" | "weekly";
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

// Calculate end time based on start time and duration
const calculateEndTime = (
  startTime: string,
  durationMinutes: number,
): string => {
  if (!startTime) return "";
  const [hourStr, minuteStr] = startTime.split(":");
  const [hour, minute] = [parseInt(hourStr), parseInt(minuteStr)];

  let totalMinutes = hour * 60 + minute + durationMinutes;
  const newHour = Math.floor(totalMinutes / 60) % 24;
  const newMinute = totalMinutes % 60;

  return `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`;
};

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
  if (recurrenceType === "none") return [startDate];

  const dates: string[] = [];
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let current = start;

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

  const handleSubmit = () => {
    if (!title || !date || !startTime || !endTime) return;

    // For recurring events, generate all dates
    const dates = isRecurring
      ? generateRecurringDates(
          date,
          endDate,
          recurrenceType,
          recurrenceType === "weekly" ? selectedDays : [],
        )
      : [date];

    // Create a blocked time task for each date
    dates.forEach((dateStr, index) => {
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
        duration,
        date: dateStr,
        isBlockedTime: true,
        isRecurring: isRecurring,
        recurrenceType: isRecurring ? recurrenceType : undefined,
      };

      onAddBlockedTime(blockedTimeTask);
    });

    onOpenChange(false);

    // Reset form
    setTitle("Blocked Time");
    setStartTime("09:00");
    setDuration(30);
    setIsRecurring(false);
    setRecurrenceType("daily");
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
