import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./dashboard/DashboardHeader";
import AssignmentGrid from "./dashboard/AssignmentGrid";
import NotificationPanel from "./dashboard/NotificationPanel";
import CalendarPanel from "./dashboard/CalendarPanel";

import OnboardingDialog from "./onboarding/OnboardingDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useAssignments } from "@/contexts/AssignmentContext";
import { useCalendar, CalendarTask } from "@/contexts/CalendarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Assignment, Task } from "@/types/assignment";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { generateNotifications, Notification } from "@/utils/notificationUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNotification } from "@/contexts/NotificationContext";
import YouTube from "@/components/focus/YouTubePlayer";

interface HomeProps {
  userTier?: "free" | "paid";
}

const Home = ({ userTier: propUserTier }: HomeProps) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { userTier, upgradeToPaid } = useUser();
  const {
    assignments,
    isFirstLogin,
    setIsFirstLogin,
    createAssignment,
    deleteAssignment,
    toggleTask,
    updateAssignment,
  } = useAssignments();
  const {
    calendarTasks,
    addCalendarTask,
    removeCalendarTask,
    toggleCalendarTask,
    updateCalendarTaskTime,
  } = useCalendar();
  const { notificationSettings } = useNotification();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(
    new Set(),
  );

  const userEmail = currentUser?.email || currentUser?.displayName || "User";
  const userImage =
    currentUser?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`;

  // Show onboarding dialog for first-time users
  useEffect(() => {
    if (isFirstLogin) {
      setShowOnboarding(true);
    }
  }, [isFirstLogin]);

  const handleCreateAssignment = () => {
    console.log("Create assignment button clicked");
    if (userTier === "free" && assignments.length >= 3) {
      console.log("Free tier limit reached, showing upgrade dialog");
      setShowUpgradeDialog(true);
      return;
    }

    // Open the onboarding dialog which serves as our assignment creation form
    console.log("Opening onboarding dialog");
    setShowOnboarding(true);
  };

  // For debugging - log when assignments change
  React.useEffect(() => {
    console.log("Home component - assignments updated:", assignments);
  }, [assignments]);

  // For debugging
  useEffect(() => {
    console.log("Current assignments:", assignments);
  }, [assignments]);

  // Generate notifications from calendar tasks
  useEffect(() => {
    const newNotifications = generateNotifications(calendarTasks, assignments, notificationSettings);

    // Preserve read status for existing notifications
    const updatedNotifications = newNotifications.map((notification) => ({
      ...notification,
      isRead: readNotifications.has(notification.id),
    }));

    setNotifications(updatedNotifications);

    // Update notification count in header
    const unreadCount = updatedNotifications.filter((n) => !n.isRead).length;
    if (unreadCount > 0 && !showNotifications) {
      // Optional: Flash the notification icon or show a toast
    }
  }, [calendarTasks, assignments, readNotifications, notificationSettings]);

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    try {
      await upgradeToPaid();
      setShowUpgradeDialog(false);
    } catch (error) {
      console.error("Error upgrading account:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAddCalendarTask = async (task: CalendarTask) => {
    console.log("handleAddCalendarTask called with:", task);
    
    // Ensure the task has all required properties
    const completeTask: CalendarTask = {
      ...task,
      id: task.id || `task-${Date.now()}`,
      assignmentId: task.assignmentId || "",
      assignmentTitle: task.assignmentTitle || "",
      title: task.title || "Untitled Task",
      completed: task.completed || false,
      startTime: task.startTime || "08:00",
      duration: task.duration || 30,
      date: task.date || new Date().toISOString().split('T')[0],
    };
    
    console.log("Adding complete task to calendar:", completeTask);
    await addCalendarTask(completeTask);
    
    // Dispatch an event to notify that a task has been added
    window.dispatchEvent(
      new CustomEvent("task-added", {
        detail: { taskId: completeTask.id, assignmentId: completeTask.assignmentId },
      })
    );
  };

  const handleRemoveCalendarTask = (taskId: string) => {
    removeCalendarTask(taskId);
  };

  const handleToggleTask = (assignmentId: string, taskId: string, forceState?: boolean) => {
    console.log(`handleToggleTask: ${assignmentId}, ${taskId}, forceState=${forceState}`);
    
    // Find the current task to determine if this is a user-initiated toggle in the assignment card
    const assignment = assignments.find(a => a.id === assignmentId);
    const task = assignment?.tasks.find(t => t.id === taskId);
    
    if (task) {
      const currentState = task.completed;
      const newState = forceState !== undefined ? forceState : !currentState;
      console.log(`Task ${taskId} toggling from ${currentState} to ${newState}`);
      
      // Always use explicit state to avoid toggle confusion
      toggleTask(assignmentId, taskId, newState);
      
      // Find if this task exists in calendar tasks and update it there too
      const calendarTask = calendarTasks.find((t) => t.id === taskId);
      if (calendarTask) {
        handleToggleCalendarTask(taskId, newState);
      }
    } else {
      // Fallback to original behavior if task not found
      toggleTask(assignmentId, taskId, forceState);
    }
  };

  const handleToggleCalendarTask = (taskId: string, forceState?: boolean) => {
    console.log(`handleToggleCalendarTask: ${taskId}, forceState=${forceState}`);
    
    // Find the current task to log the state change
    const calendarTask = calendarTasks.find(task => task.id === taskId);
    
    if (calendarTask) {
      const currentState = calendarTask.completed;
      const newState = forceState !== undefined ? forceState : !currentState;
      console.log(`Calendar task ${taskId} toggling from ${currentState} to ${newState}`);
      
      // Always use explicit state to avoid toggle confusion
      toggleCalendarTask(taskId, newState);
      
      // If necessary, also update the assignment task
      if (calendarTask.assignmentId) {
        // Only toggle the assignment task if it's not already being toggled
        // to avoid circular updates
        const assignment = assignments.find(a => a.id === calendarTask.assignmentId);
        const task = assignment?.tasks.find(t => t.id === taskId);
        
        if (task && task.completed !== newState) {
          console.log(`Syncing assignment task state with calendar task: ${taskId}`);
          toggleTask(calendarTask.assignmentId, taskId, newState);
        }
      }
    } else {
      // Fallback to original behavior if task not found
      toggleCalendarTask(taskId, forceState);
    }
  };

  const handleDeleteAssignment = (id: string) => {
    deleteAssignment(id);
  };

  const handleUpdateAssignment = (assignment: Assignment) => {
    // Check if this is a delete operation
    if (assignment._delete) {
      deleteAssignment(assignment.id);
      return;
    }

    // Otherwise update normally
    updateAssignment(assignment);

    // Force an immediate refresh of drag handlers after assignment update
    window.dispatchEvent(new Event("dragHandlersUpdate"));

    // Multiple attempts with increasing delays to ensure handlers are attached
    for (let delay of [10, 50, 100, 200, 500]) {
      setTimeout(() => {
        window.dispatchEvent(new Event("dragHandlersUpdate"));
      }, delay);
    }
  };

  // Listen for show-calendar events
  useEffect(() => {
    const handleShowCalendar = () => {
      console.log("Home component received show-calendar event");
      setShowCalendar(true);
      setShowNotifications(false);
    };

    window.addEventListener("show-calendar", handleShowCalendar);

    return () => {
      window.removeEventListener("show-calendar", handleShowCalendar);
    };
  }, []);

  // Focus on current time indicator when initially logging in
  useEffect(() => {
    if (currentUser && showCalendar) {
      // Short delay to ensure the calendar has rendered
      setTimeout(() => {
        const currentTimeIndicator = document.querySelector(
          ".current-time-indicator",
        );
        if (currentTimeIndicator) {
          currentTimeIndicator.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          console.log("Scrolled to current time indicator");
        }
      }, 1000);
    }
  }, [currentUser, showCalendar]);

  // Listen for focus-calendar-task events to show the calendar panel
  useEffect(() => {
    const handleFocusTask = (event: any) => {
      console.log(
        "Home component received focus-calendar-task event",
        event.detail,
      );
      // Make sure calendar is visible when a task is focused
      if (!showCalendar) {
        console.log("Showing calendar panel");
        setShowCalendar(true);
        setShowNotifications(false);
      }
      
      // Force a re-render of the calendar panel
      const forceUpdate = new Event('resize');
      window.dispatchEvent(forceUpdate);
      
      // Ensure the calendar panel is visible by scrolling to it
      setTimeout(() => {
        const calendarPanel = document.querySelector('.calendar-panel');
        if (calendarPanel) {
          calendarPanel.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };

    window.addEventListener("focus-calendar-task", handleFocusTask);

    return () => {
      window.removeEventListener("focus-calendar-task", handleFocusTask);
    };
  }, [showCalendar, setShowCalendar, setShowNotifications]);

  // Listen for show-calendar-panel events
  useEffect(() => {
    const handleShowCalendarPanel = (event: any) => {
      console.log(
        "Home component received show-calendar-panel event",
        event.detail,
      );
      // Make sure calendar is visible
      if (event.detail.show && !showCalendar) {
        console.log("Showing calendar panel from show-calendar-panel event");
        setShowCalendar(true);
        setShowNotifications(false);
        
        // Force a re-render of the calendar panel
        const forceUpdate = new Event('resize');
        window.dispatchEvent(forceUpdate);
        
        // Ensure the calendar panel is visible by scrolling to it
        setTimeout(() => {
          const calendarPanel = document.querySelector('.calendar-panel');
          if (calendarPanel) {
            calendarPanel.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    window.addEventListener("show-calendar-panel", handleShowCalendarPanel);

    return () => {
      window.removeEventListener("show-calendar-panel", handleShowCalendarPanel);
    };
  }, [showCalendar, setShowCalendar, setShowNotifications]);

  // Listen for navigate-calendar-to-date events
  useEffect(() => {
    const handleNavigateToDate = (event: any) => {
      console.log(
        "Home component received navigate-calendar-to-date event",
        event.detail,
      );
      // Make sure calendar is visible
      if (!showCalendar) {
        console.log("Showing calendar panel from navigate-calendar-to-date event");
        setShowCalendar(true);
        setShowNotifications(false);
      }
    };

    window.addEventListener("navigate-calendar-to-date", handleNavigateToDate);

    return () => {
      window.removeEventListener("navigate-calendar-to-date", handleNavigateToDate);
    };
  }, [showCalendar, setShowCalendar, setShowNotifications]);

  // Listen for task-toggled-in-focus events
  useEffect(() => {
    // Keep track of tasks being processed to avoid circular updates
    const tasksBeingProcessed = new Set<string>();
    
    const handleTaskToggledInFocus = (event: any) => {
      console.log(
        "Home component received task-toggled-in-focus event",
        event.detail
      );
      const { taskId, assignmentId, completed } = event.detail;
      
      // Generate a unique key for this task update
      const updateKey = `${taskId}-${completed}`;
      
      // If this task is already being processed, skip to avoid loops
      if (tasksBeingProcessed.has(updateKey)) {
        console.log(`Task ${taskId} is already being processed, skipping to avoid loops`);
        return;
      }
      
      // Add to processing set
      tasksBeingProcessed.add(updateKey);
      
      // Check if the assignment task already has the correct state
      const assignment = assignments.find(a => a.id === assignmentId);
      const task = assignment?.tasks.find(t => t.id === taskId);
      
      // Do the same check for calendar task
      const calendarTask = calendarTasks.find(task => task.id === taskId);
      
      // Update the task in the assignment if needed
      if (taskId && assignmentId) {
        console.log(`Focus mode: Task ${taskId} in assignment ${assignmentId} change to completed=${completed}`);
        
        // Only update assignment if state is different
        if (!task || task.completed !== completed) {
          console.log(`Updating assignment task state: ${taskId}`);
          // Always pass explicit completed state
          toggleTask(assignmentId, taskId, completed);
        } else {
          console.log(`Assignment task ${taskId} already in correct state (${completed}), skipping update`);
        }
        
        // Update calendar task if it exists and state is different
        if (calendarTask && calendarTask.completed !== completed) {
          console.log(`Updating calendar task state: ${taskId} to ${completed}`);
          toggleCalendarTask(taskId, completed);
        } else if (calendarTask) {
          console.log(`Calendar task ${taskId} already in correct state (${completed}), skipping update`);
        }
        
        // Force a UI refresh with custom event containing task info
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('calendar-tasks-updated', {
              detail: { 
                fromFocusMode: true, 
                taskId, 
                completed,
                source: 'focus-mode'
              }
            })
          );
          
          // Remove from processing set after a delay to allow all updates to complete
          setTimeout(() => {
            tasksBeingProcessed.delete(updateKey);
            console.log(`Task ${taskId} processing complete, removed from tracking`);
          }, 500);
        }, 100);
      }
    };

    window.addEventListener("task-toggled-in-focus", handleTaskToggledInFocus);

    return () => {
      window.removeEventListener("task-toggled-in-focus", handleTaskToggledInFocus);
    };
  }, [assignments, calendarTasks, toggleTask, toggleCalendarTask]);

  const handleUpdateTaskTime = (
    taskId: string,
    startTime: string,
    endTime?: string,
    duration?: number,
  ) => {
    updateCalendarTaskTime(taskId, startTime, endTime, duration);
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    // When entering focus mode, hide notifications and calendar
    if (!isFocusMode) {
      setShowNotifications(false);
      setShowCalendar(false);
    }
  };

  const toggleNotifications = () => {
    // If in focus mode, exit focus mode first
    if (isFocusMode) {
      setIsFocusMode(false);
    }
    setShowCalendar(false);
    setShowNotifications(!showNotifications);
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
    setReadNotifications((prev) => new Set(prev).add(id));
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
    setReadNotifications((prev) => new Set(prev).add(id));
  };

  const handleClearAllNotifications = () => {
    // Mark all as read but don't remove them
    const allIds = notifications.map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setReadNotifications((prev) => {
      const newSet = new Set(prev);
      allIds.forEach((id) => newSet.add(id));
      return newSet;
    });
  };

  const handleViewTask = (taskId: string, assignmentId: string) => {
    // Focus the task in the calendar
    window.dispatchEvent(
      new CustomEvent("focus-calendar-task", {
        detail: { taskId },
      }),
    );

    // Show calendar panel
    setShowCalendar(true);
    setShowNotifications(false);
  };

  const toggleCalendar = () => {
    // If in focus mode, exit focus mode first
    if (isFocusMode) {
      setIsFocusMode(false);
    }
    setShowNotifications(false);
    setShowCalendar(!showCalendar);
  };

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  // Focus Stage Component
  const FocusStage = () => {
    return (
      <div className="flex-1 bg-background border border-border rounded-lg p-8 flex flex-col items-center justify-center min-h-[600px]">
        <h2 className="text-3xl font-bold mb-6">Focus Mode</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          This is your distraction-free zone. The assignment cards and calendar have been hidden to help you concentrate.
        </p>
        <div className="w-full max-w-2xl">
          <YouTube defaultVideoUrl="https://www.youtube.com/watch?v=1VUYq36Yu3o" />
        </div>
      </div>
    );
  };

  // Make sure we have the DndProvider at the top level
  let content = (
    <DndProvider backend={HTML5Backend}>
      <div className={`min-h-screen bg-background ${theme}`}>
        <DashboardHeader
          userEmail={currentUser?.email || ""}
          userImage={
            currentUser?.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email}`
          }
          isFreeTier={userTier === "free"}
          notificationCount={notifications.filter((n) => !n.isRead).length}
          showNotifications={showNotifications}
          showCalendar={showCalendar}
          isFocusMode={isFocusMode}
          isDarkMode={theme === "dark"}
          onUpgradeClick={handleUpgradeClick}
          onLogout={handleLogout}
          onSettingsClick={handleSettingsClick}
          onNotificationClick={toggleNotifications}
          onCalendarClick={toggleCalendar}
          onFocusClick={toggleFocusMode}
          onThemeToggle={toggleTheme}
        />

        <main className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Main content area */}
            <div className="flex-1">
              {isFocusMode ? (
                <FocusStage />
              ) : (
                <AssignmentGrid
                  assignments={assignments}
                  calendarTasks={calendarTasks}
                  onCreateAssignment={handleCreateAssignment}
                  onDeleteAssignment={handleDeleteAssignment}
                  onTaskToggle={handleToggleTask}
                  onUpdateAssignment={handleUpdateAssignment}
                />
              )}
            </div>

            {/* Right sidebar - either calendar or notifications */}
            {!isFocusMode && (
              <div className="hidden lg:block w-[500px]">
                {showCalendar && (
                  <CalendarPanel
                    calendarTasks={calendarTasks}
                    onAddTask={handleAddCalendarTask}
                    onRemoveTask={handleRemoveCalendarTask}
                    onToggleTask={handleToggleCalendarTask}
                    onUpdateTaskTime={handleUpdateTaskTime}
                  />
                )}

                {showNotifications && (
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAsRead={handleMarkNotificationAsRead}
                    onDismiss={handleDismissNotification}
                    onViewTask={handleViewTask}
                    onClearAll={handleClearAllNotifications}
                  />
                )}
              </div>
            )}
          </div>
        </main>

        {/* Onboarding/Assignment Creation Dialog */}
        <OnboardingDialog
          open={showOnboarding}
          onOpenChange={(open) => {
            setShowOnboarding(open);
            if (!open && isFirstLogin) {
              setIsFirstLogin(false);
            }
          }}
          onCreateAssignment={createAssignment}
        />

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade to Premium</DialogTitle>
              <DialogDescription>
                Unlock unlimited assignments and tasks with our premium plan for
                just $39 one-time payment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 p-4">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Unlimited assignments</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Unlimited tasks per assignment</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Advanced progress tracking</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Priority support</span>
              </div>
              <button
                className="w-full bg-primary text-white rounded-lg py-2 px-4 hover:bg-primary/90"
                onClick={handleConfirmUpgrade}
              >
                Upgrade Now - $39
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );

  return content;
};

export default Home;
