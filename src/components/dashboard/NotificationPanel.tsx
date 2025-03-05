import React from "react";
import { Bell, Calendar, Check, X, Clock } from "lucide-react";
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
import { Notification } from "@/utils/notificationUtils";
import { useTimeFormat } from "@/contexts/TimeFormatContext";

interface NotificationPanelProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onViewTask?: (taskId: string, assignmentId: string) => void;
  onClearAll?: () => void;
}

const NotificationPanel = ({
  notifications = [],
  onMarkAsRead = () => {},
  onDismiss = () => {},
  onViewTask = () => {},
  onClearAll = () => {},
}: NotificationPanelProps) => {
  const { formatTime } = useTimeFormat();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Format the due date and time for display
  const formatDueDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      // Ensure we're using the local date parts to avoid timezone issues
      const timeStr = formatTime(
        `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`,
      );
      // Use toLocaleDateString to get consistent date formatting
      return `${date.toLocaleDateString()} at ${timeStr}`;
    } catch (error) {
      return dateTimeStr;
    }
  };

  // Calculate how soon the task is due
  const getTimeUntilDue = (dateTimeStr: string) => {
    try {
      // Parse the ISO date string
      const dueDate = new Date(dateTimeStr);
      const now = new Date();

      // Calculate time difference in milliseconds
      const diffMs = dueDate.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      // Format the time until due
      if (diffHrs <= 0 && diffMins <= 0) {
        return "Due now";
      } else if (diffHrs < 1) {
        return `Due in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
      } else {
        return `Due in ${diffHrs} hour${diffHrs !== 1 ? "s" : ""} ${diffMins} minute${diffMins !== 1 ? "s" : ""}`;
      }
    } catch (error) {
      console.error("Error calculating time until due:", error);
      return "";
    }
  };

  return (
    <Card className="w-[500px] bg-card text-card-foreground shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            Clear all
          </Button>
        </div>
        <CardDescription>Your upcoming assignment tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start space-x-4 p-3 rounded-lg ${notification.isRead ? "bg-gray-50 dark:bg-gray-800" : "bg-blue-50 dark:bg-blue-900"}`}
                >
                  <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        {notification.title}
                      </h4>
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTimeUntilDue(notification.dueDate)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {notification.assignment}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Due: {formatDueDateTime(notification.dueDate)}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-6 text-xs text-blue-500 mt-1"
                      onClick={() =>
                        onViewTask(
                          notification.taskId,
                          notification.assignmentId,
                        )
                      }
                    >
                      View in calendar
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onMarkAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDismiss(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="h-12 w-12 mb-3 opacity-20" />
                <p>No upcoming tasks in the next 12 hours</p>
                <p className="text-xs mt-2">
                  Add tasks to your calendar to see them here
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;
