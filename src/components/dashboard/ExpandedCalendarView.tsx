import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CalendarPanel from "./CalendarPanel";
import { CalendarTask } from "@/contexts/CalendarContext";

interface ExpandedCalendarViewProps {
  calendarTasks: CalendarTask[];
  onAddTask: (task: CalendarTask) => void;
  onRemoveTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateTaskTime: (
    taskId: string,
    startTime: string,
    endTime?: string,
    duration?: number,
  ) => void;
  onClose: () => void;
}

const ExpandedCalendarView = ({
  calendarTasks = [],
  onAddTask = () => {},
  onRemoveTask = () => {},
  onToggleTask = () => {},
  onUpdateTaskTime = () => {},
  onClose = () => {},
}: ExpandedCalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  // Generate week dates based on selected date
  useEffect(() => {
    const dates = [];
    const currentDay = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate the first day of the week (Sunday)
    const firstDayOfWeek = new Date(selectedDate);
    firstDayOfWeek.setDate(selectedDate.getDate() - currentDay);

    // Generate array of dates for the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDayOfWeek);
      date.setDate(firstDayOfWeek.getDate() + i);
      dates.push(date);
    }

    setWeekDates(dates);
  }, [selectedDate]);

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setSelectedDate(prevWeek);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const nextWeek = new Date(selectedDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setSelectedDate(nextWeek);
  };

  // Format date range for display
  const formatDateRange = () => {
    if (weekDates.length === 0) return "";

    const firstDay = weekDates[0];
    const lastDay = weekDates[6];

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };

    return `${firstDay.toLocaleDateString("en-US", formatOptions)} - ${lastDay.toLocaleDateString("en-US", formatOptions)}, ${lastDay.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto p-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{formatDateRange()}</span>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-auto"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Week View */}
        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const dateISO = date.toISOString().split("T")[0];
            const isToday = new Date().toISOString().split("T")[0] === dateISO;
            const dayName = date.toLocaleDateString("en-US", {
              weekday: "short",
            });
            const dayNumber = date.getDate();

            return (
              <div key={index} className="flex flex-col">
                <div
                  className={`text-center p-2 rounded-t-md ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <div className="font-medium">{dayName.charAt(0)}</div>
                  <div className={`text-xl ${isToday ? "font-bold" : ""}`}>
                    {dayNumber}
                  </div>
                </div>
                <div className="flex-1 border rounded-b-md overflow-hidden">
                  <CalendarPanel
                    calendarTasks={calendarTasks}
                    onAddTask={onAddTask}
                    onRemoveTask={onRemoveTask}
                    onToggleTask={onToggleTask}
                    onUpdateTaskTime={onUpdateTaskTime}
                    selectedDate={date}
                    isEmbedded={true}
                    hideScheduleHeader={true}
                    hideViewMonthButton={true}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExpandedCalendarView;
