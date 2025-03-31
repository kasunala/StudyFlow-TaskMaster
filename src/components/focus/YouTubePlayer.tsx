import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VolumeX, Volume2, Save, Plus, Clock, CalendarCheck, Bell, CheckCircle } from "lucide-react";
import { useCalendar, CalendarTask } from "@/contexts/CalendarContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Badge } from "@/components/ui/badge";

interface YouTubePlayerProps {
  defaultVideoUrl?: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ 
  defaultVideoUrl = "https://www.youtube.com/watch?v=1VUYq36Yu3o" 
}) => {
  const [videoUrl, setVideoUrl] = useState<string>(defaultVideoUrl);
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAddNew, setShowAddNew] = useState<boolean>(false);
  const [newVideoUrl, setNewVideoUrl] = useState<string>("");
  const [savedVideos, setSavedVideos] = useState<string[]>([]);
  // States for task tracking
  const [currentTask, setCurrentTask] = useState<CalendarTask | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<CalendarTask[]>([]);
  const [remainingTime, setRemainingTime] = useState<string>("");
  const [taskExpired, setTaskExpired] = useState<boolean>(false);
  // Ref to preserve video player state between renders
  const videoPlayerRef = useRef<HTMLIFrameElement | null>(null);
  
  // Get calendar tasks and notification settings
  const { calendarTasks, toggleCalendarTask } = useCalendar();
  const { notificationSettings } = useNotification();
  
  // Parse YouTube URL to get embed URL
  useEffect(() => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      const newEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&mute=${isMuted ? 1 : 0}`;
      setEmbedUrl(newEmbedUrl);
    }
  }, [videoUrl, isMuted]);

  // Load saved videos from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("focusYouTubeVideos");
    if (saved) {
      try {
        const parsedVideos = JSON.parse(saved);
        if (Array.isArray(parsedVideos)) {
          setSavedVideos(parsedVideos);
        }
      } catch (e) {
        console.error("Failed to parse saved videos", e);
      }
    }
  }, []);

  // Find current task in progress and upcoming tasks
  useEffect(() => {
    if (!calendarTasks || calendarTasks.length === 0) {
      setCurrentTask(null);
      setUpcomingTasks([]);
      return;
    }

    // Current date and time
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filter tasks for today and future
    const relevantTasks = calendarTasks.filter(task => {
      if (!task.date || !task.startTime || task.completed) return false;
      
      const [year, month, day] = task.date.split("-").map(Number);
      const taskDate = new Date(year, month - 1, day);
      
      // Only include today and future tasks
      return taskDate >= today;
    });
    
    // Find current task in progress
    const inProgressTask = relevantTasks.find(task => {
      if (!task.date || !task.startTime || !task.endTime) return false;
      
      const [year, month, day] = task.date.split("-").map(Number);
      const [startHour, startMinute] = task.startTime.split(':').map(Number);
      const [endHour, endMinute] = task.endTime.split(':').map(Number);
      
      const taskStartTime = new Date(year, month - 1, day, startHour, startMinute);
      const taskEndTime = new Date(year, month - 1, day, endHour, endMinute);
      
      // Check if current time is between start and end time
      return now >= taskStartTime && now <= taskEndTime;
    });
    
    // Find upcoming tasks based on notification settings
    const upcoming = relevantTasks
      .filter(task => {
        if (!task.date || !task.startTime) return false;
        
        // Skip blocked time notifications if disabled in settings
        if (task.isBlockedTime && !notificationSettings.enableBlockedTimeNotifications) return false;
        
        const [year, month, day] = task.date.split("-").map(Number);
        const [hours, minutes] = task.startTime.split(":").map(Number);
        const taskDate = new Date(year, month - 1, day, hours, minutes);
        
        // Skip the current task if it's already in progress
        if (inProgressTask && task.id === inProgressTask.id) return false;
        
        // Only include future tasks
        if (taskDate < now) return false;
        
        // Calculate time difference in hours
        const timeDiff = (taskDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Include tasks within the notification time range
        return timeDiff >= -notificationSettings.notificationTimeRangeBefore && 
               timeDiff <= notificationSettings.notificationTimeRangeAfter;
      })
      .sort((a, b) => {
        // Sort by date and time
        const [yearA, monthA, dayA] = a.date.split("-").map(Number);
        const [hoursA, minutesA] = a.startTime.split(":").map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA);
        
        const [yearB, monthB, dayB] = b.date.split("-").map(Number);
        const [hoursB, minutesB] = b.startTime.split(":").map(Number);
        const dateB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB);
        
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3); // Limit to 3 upcoming tasks
    
    // Reset task expired flag when current task changes
    if (!inProgressTask || (currentTask && inProgressTask.id !== currentTask.id)) {
      setTaskExpired(false);
    }
    
    setCurrentTask(inProgressTask || null);
    setUpcomingTasks(upcoming);
  }, [calendarTasks, notificationSettings, currentTask]);
  
  // Update countdown timer for current task
  useEffect(() => {
    if (!currentTask || !currentTask.date || !currentTask.endTime) {
      setRemainingTime("");
      return;
    }
    
    const updateRemainingTime = () => {
      const now = new Date();
      const [year, month, day] = currentTask.date.split("-").map(Number);
      const [endHour, endMinute] = currentTask.endTime.split(':').map(Number);
      const endTime = new Date(year, month - 1, day, endHour, endMinute);
      
      // Calculate time difference in milliseconds
      const diffMs = endTime.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        // Task is now expired
        setRemainingTime("00:00:00");
        setTaskExpired(true);
        
        // If there are upcoming tasks, move to the next one automatically
        if (upcomingTasks.length > 0 && !currentTask.completed) {
          // Wait a moment before moving to the next task
          setTimeout(() => {
            moveToNextTask();
          }, 3000);
        }
        return;
      }
      
      // Convert to hours, minutes, seconds
      const diffSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      
      // Format time
      setRemainingTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    // Update immediately
    updateRemainingTime();
    
    // Update every second
    const interval = setInterval(updateRemainingTime, 1000);
    
    return () => clearInterval(interval);
  }, [currentTask, upcomingTasks]);
  
  // Handle completing a task - modified to prevent video refresh
  const handleCompleteTask = useCallback(() => {
    if (currentTask) {
      console.log(`Completing task ${currentTask.id} in focus mode`);
      
      // Mark task as completed in calendar
      toggleCalendarTask(currentTask.id);
      
      // Also sync with the assignment task by dispatching a custom event
      // This will ensure the assignment card is updated
      window.dispatchEvent(
        new CustomEvent("task-toggled-in-focus", {
          detail: { 
            taskId: currentTask.id,
            assignmentId: currentTask.assignmentId,
            completed: true
          },
        })
      );
      
      // Force a UI refresh by dispatching a calendar update event
      // but with a flag indicating it's from focus mode to prevent video refresh
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('calendar-tasks-updated', {
            detail: { fromFocusMode: true }
          })
        );
      }, 100);
      
      // Handle next task without refreshing the video
      if (upcomingTasks.length > 0) {
        // Update state without refreshing the video
        setCurrentTask(upcomingTasks[0]);
        setUpcomingTasks(prev => prev.slice(1));
        
        // Still dispatch the focus event for other components
        window.dispatchEvent(
          new CustomEvent("focus-calendar-task", {
            detail: { 
              taskId: upcomingTasks[0].id,
              date: upcomingTasks[0].date,
              startTime: upcomingTasks[0].startTime,
              assignmentId: upcomingTasks[0].assignmentId,
              assignmentTitle: upcomingTasks[0].assignmentTitle,
              taskTitle: upcomingTasks[0].title,
            },
          })
        );
        console.log("Moving to next task:", upcomingTasks[0].title);
      } else {
        // If no more tasks, just update current task to null
        setCurrentTask(null);
      }
    }
  }, [currentTask, toggleCalendarTask, upcomingTasks]);
  
  // Handle uncompleting a task - fix for uncomplete task issue
  const handleUncompleteTask = useCallback(() => {
    if (currentTask) {
      console.log(`Uncompleting task ${currentTask.id} in focus mode`);
      
      // Mark task as not completed in calendar
      toggleCalendarTask(currentTask.id);
      
      // Also sync with the assignment task by dispatching a custom event
      // This will ensure the assignment card is updated with the correct status
      window.dispatchEvent(
        new CustomEvent("task-toggled-in-focus", {
          detail: { 
            taskId: currentTask.id,
            assignmentId: currentTask.assignmentId,
            completed: false
          },
        })
      );
      
      // Force a UI refresh by dispatching a calendar update event
      // but with a flag indicating it's from focus mode to prevent video refresh
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('calendar-tasks-updated', {
            detail: { fromFocusMode: true }
          })
        );
      }, 100);
    }
  }, [currentTask, toggleCalendarTask]);
  
  // Move to next task
  const moveToNextTask = () => {
    if (upcomingTasks.length > 0) {
      // If there's a current task that expired but isn't completed, mark it as completed
      if (currentTask && taskExpired && !currentTask.completed) {
        console.log(`Auto-completing expired task ${currentTask.id} in focus mode`);
        
        // Mark current task as completed in calendar
        toggleCalendarTask(currentTask.id);
        
        // Sync with assignment task
        window.dispatchEvent(
          new CustomEvent("task-toggled-in-focus", {
            detail: { 
              taskId: currentTask.id,
              assignmentId: currentTask.assignmentId,
              completed: true
            },
          })
        );
        
        // Force a UI refresh but with a flag to prevent video refreshing
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('calendar-tasks-updated', {
              detail: { fromFocusMode: true }
            })
          );
        }, 100);
      }
      
      // Focus on the next task
      window.dispatchEvent(
        new CustomEvent("focus-calendar-task", {
          detail: { 
            taskId: upcomingTasks[0].id,
            date: upcomingTasks[0].date,
            startTime: upcomingTasks[0].startTime,
            assignmentId: upcomingTasks[0].assignmentId,
            assignmentTitle: upcomingTasks[0].assignmentTitle,
            taskTitle: upcomingTasks[0].title,
          },
        })
      );
      console.log("Moving to next task:", upcomingTasks[0].title);
    }
  };

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    // Handle different YouTube URL formats
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Save a new video URL
  const handleSaveVideo = () => {
    if (newVideoUrl && extractVideoId(newVideoUrl)) {
      const updatedVideos = [...savedVideos, newVideoUrl];
      setSavedVideos(updatedVideos);
      setVideoUrl(newVideoUrl);
      setNewVideoUrl("");
      setShowAddNew(false);
      
      // Save to localStorage
      localStorage.setItem("focusYouTubeVideos", JSON.stringify(updatedVideos));
    }
  };

  // Select a saved video
  const selectVideo = (url: string) => {
    setVideoUrl(url);
  };
  
  // Format time for display
  const formatTimeForDisplay = (time: string) => {
    if (!time) return "";
    
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Format date for display
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "Today";
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [year, month, day] = dateStr.split("-").map(Number);
    const taskDate = new Date(year, month - 1, day);
    
    // Check if date is today or tomorrow
    if (taskDate.getTime() === today.getTime()) {
      return "Today";
    } else if (taskDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      // Format as month/day
      return `${month}/${day}`;
    }
  };

  return (
    <Card className="w-full shadow-md">
      {/* Task Tracking Panel */}
      {(currentTask || upcomingTasks.length > 0) && (
        <div className="border-b border-border p-4 bg-muted/30">
          {currentTask ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-primary" />
                  <span className="text-sm font-medium">Current Task:</span>
                </div>
                <Badge variant={taskExpired ? "destructive" : "outline"} className={taskExpired ? "" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}>
                  {taskExpired ? "Time's Up" : "In Progress"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-card rounded-md border border-border">
                <div className="flex-1">
                  <h3 className="text-base font-semibold">{currentTask.title}</h3>
                  <p className="text-xs text-muted-foreground">{currentTask.assignmentTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-mono font-bold text-primary px-3 py-1 rounded-md bg-primary/10">
                    {remainingTime}
                  </div>
                  {currentTask.completed ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1 text-orange-600 hover:bg-orange-50 hover:text-orange-700 border-orange-200"
                      onClick={handleUncompleteTask}
                    >
                      <CheckCircle size={16} className="text-orange-600" />
                      <span>Uncomplete</span>
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1 text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200"
                      onClick={handleCompleteTask}
                    >
                      <CheckCircle size={16} />
                      <span>Complete</span>
                    </Button>
                  )}
                </div>
              </div>
              {taskExpired && upcomingTasks.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                  Moving to next task: {upcomingTasks[0].title}...
                </div>
              )}
            </div>
          ) : upcomingTasks.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-primary" />
                <span className="text-sm font-medium">Current Status:</span>
              </div>
              <div className="p-2 bg-card rounded-md border border-border text-center">
                <p className="text-sm text-muted-foreground">No active tasks in progress</p>
                <p className="text-xs">Your next task starts in {formatDateForDisplay(upcomingTasks[0].date)} at {formatTimeForDisplay(upcomingTasks[0].startTime)}</p>
              </div>
            </div>
          )}
          
          {upcomingTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarCheck size={16} className="text-primary" />
                <span className="text-sm font-medium">Upcoming:</span>
              </div>
              <div className="space-y-2 rounded-md border border-border p-2 bg-card">
                {upcomingTasks.map((task, index) => (
                  <div key={task.id} className={`flex items-center justify-between text-sm p-2 ${index !== upcomingTasks.length - 1 ? 'border-b border-border pb-2' : ''}`}>
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-muted-foreground">{task.assignmentTitle}</div>
                    </div>
                    <div className="text-xs bg-primary/10 px-2 py-1 rounded-md">
                      {formatDateForDisplay(task.date)} {formatTimeForDisplay(task.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Focus Video</span>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAddNew(!showAddNew)}
              title="Add new video"
            >
              <Plus size={20} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* YouTube embed iframe - using ref to maintain state */}
        <div className="aspect-video w-full mb-4">
          {embedUrl && (
            <iframe
              ref={videoPlayerRef}
              src={embedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-md"
              key="youtube-player-iframe" // Use a fixed key to prevent recreation
            ></iframe>
          )}
        </div>
        
        {/* Add new video form */}
        {showAddNew && (
          <div className="mb-4 p-3 border rounded-md">
            <Label htmlFor="new-video-url" className="mb-2 block">Add YouTube Video URL</Label>
            <div className="flex gap-2">
              <Input
                id="new-video-url"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1"
              />
              <Button onClick={handleSaveVideo}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
            </div>
          </div>
        )}
        
        {/* Saved videos list */}
        {savedVideos.length > 0 && (
          <div className="mt-4">
            <Label className="mb-2 block">Your Saved Videos</Label>
            <div className="flex flex-wrap gap-2">
              {savedVideos.map((url, index) => (
                <Button
                  key={index}
                  variant={videoUrl === url ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectVideo(url)}
                  className="text-xs"
                >
                  Video {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YouTubePlayer; 