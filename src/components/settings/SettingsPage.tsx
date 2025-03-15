import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bell, Clock, Moon, Sun } from "lucide-react";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { notificationSettings, updateNotificationSettings } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const { timeFormat, toggleTimeFormat } = useTimeFormat();
  
  // Local state for time range sliders
  const [beforeRange, setBeforeRange] = useState(notificationSettings.notificationTimeRangeBefore);
  const [afterRange, setAfterRange] = useState(notificationSettings.notificationTimeRangeAfter);

  const handleBlockedTimeNotificationsToggle = async (checked: boolean) => {
    await updateNotificationSettings({
      enableBlockedTimeNotifications: checked
    });
  };

  const handleTimeRangeChange = async () => {
    await updateNotificationSettings({
      notificationTimeRangeBefore: beforeRange,
      notificationTimeRangeAfter: afterRange
    });
  };

  const handleBackClick = () => {
    navigate("/");
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={handleBackClick} 
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">General Notifications</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Blocked Time Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for blocked time periods
                    </p>
                  </div>
                  <Switch 
                    checked={notificationSettings.enableBlockedTimeNotifications}
                    onCheckedChange={handleBlockedTimeNotificationsToggle}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Notification Time Range
                </h3>
                <p className="text-sm text-muted-foreground">
                  Adjust how far in advance and after the current time you want to receive notifications
                </p>

                <div className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">
                        Hours before current time: {beforeRange}
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {beforeRange} hour{beforeRange !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Slider
                      value={[beforeRange]}
                      min={1}
                      max={12}
                      step={1}
                      onValueChange={(value) => setBeforeRange(value[0])}
                      onValueCommit={handleTimeRangeChange}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">
                        Hours after current time: {afterRange}
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {afterRange} hour{afterRange !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Slider
                      value={[afterRange]}
                      min={1}
                      max={12}
                      step={1}
                      onValueChange={(value) => setAfterRange(value[0])}
                      onValueCommit={handleTimeRangeChange}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark mode
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={toggleTheme}
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your user experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Time Format</p>
                  <p className="text-sm text-muted-foreground">
                    Choose between 12-hour and 24-hour time format
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {timeFormat === "12h" ? "12-hour" : "24-hour"}
                  </span>
                  <Switch 
                    checked={timeFormat === "24h"}
                    onCheckedChange={() => toggleTimeFormat()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage; 