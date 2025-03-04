import React from "react";
import { Bell, Calendar, Check, X } from "lucide-react";
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

interface Notification {
  id: string;
  title: string;
  assignment: string;
  dueDate: string;
  isRead: boolean;
}

interface NotificationPanelProps {
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const NotificationPanel = ({
  notifications = [
    {
      id: "1",
      title: "Warm-up task due soon",
      assignment: "Math Assignment",
      dueDate: "2024-04-01",
      isRead: false,
    },
    {
      id: "2",
      title: "Research materials deadline",
      assignment: "History Project",
      dueDate: "2024-04-03",
      isRead: false,
    },
    {
      id: "3",
      title: "Final submission approaching",
      assignment: "Science Report",
      dueDate: "2024-04-05",
      isRead: true,
    },
  ],
  onMarkAsRead = () => {},
  onDismiss = () => {},
}: NotificationPanelProps) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Card className="w-[400px] bg-white shadow-lg">
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
          <Button variant="ghost" size="sm">
            Clear all
          </Button>
        </div>
        <CardDescription>Your upcoming assignment tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-4 p-3 rounded-lg ${notification.isRead ? "bg-gray-50" : "bg-blue-50"}`}
              >
                <Calendar className="h-5 w-5 text-gray-500 mt-1" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{notification.title}</h4>
                  <p className="text-sm text-gray-500">
                    {notification.assignment}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Due: {new Date(notification.dueDate).toLocaleDateString()}
                  </p>
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
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;
