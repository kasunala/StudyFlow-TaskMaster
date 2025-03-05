import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./dashboard/DashboardHeader";
import AssignmentGrid from "./dashboard/AssignmentGrid";
import NotificationPanel from "./dashboard/NotificationPanel";
import CalendarPanel from "./dashboard/CalendarPanel";
import OnboardingDialog from "./onboarding/OnboardingDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignments } from "@/contexts/AssignmentContext";
import { useCalendar, CalendarTask } from "@/contexts/CalendarContext";
import { Assignment, Task } from "@/types/assignment";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HomeProps {
  userTier?: "free" | "paid";
}

const Home = ({ userTier = "free" }: HomeProps) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
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

  const [showNotifications, setShowNotifications] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false);
  const [showOnboarding, setShowOnboarding] = React.useState(false);

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

  // For debugging
  useEffect(() => {
    console.log("Current assignments:", assignments);
  }, [assignments]);

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAddCalendarTask = (task: CalendarTask) => {
    addCalendarTask(task);
  };

  const handleRemoveCalendarTask = (taskId: string) => {
    removeCalendarTask(taskId);
  };

  const handleToggleCalendarTask = (taskId: string) => {
    toggleCalendarTask(taskId);

    // Find which assignment this task belongs to and toggle it there too
    const calendarTask = calendarTasks.find((task) => task.id === taskId);
    if (calendarTask) {
      toggleTask(calendarTask.assignmentId, taskId);
    }
  };

  const handleUpdateTaskTime = (
    taskId: string,
    startTime: string,
    endTime?: string,
    duration?: number,
  ) => {
    updateCalendarTaskTime(taskId, startTime, endTime, duration);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setShowCalendar(false);
    }
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
    if (!showCalendar) {
      setShowNotifications(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-100">
        <DashboardHeader
          userEmail={userEmail}
          userImage={userImage}
          isFreeTier={userTier === "free"}
          notificationCount={3}
          onUpgradeClick={handleUpgradeClick}
          onLogout={handleLogout}
          onNotificationClick={toggleNotifications}
          onCalendarClick={toggleCalendar}
          showCalendar={showCalendar}
          showNotifications={showNotifications}
        />

        <main className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Main content area */}
            <div className="flex-1">
              <AssignmentGrid
                assignments={assignments}
                calendarTasks={calendarTasks}
                onCreateAssignment={handleCreateAssignment}
                onDeleteAssignment={deleteAssignment}
                onTaskToggle={toggleTask}
                onUpdateAssignment={updateAssignment}
              />
            </div>

            {/* Right sidebar - either calendar or notifications */}
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
                  onMarkAsRead={(id) => console.log("Mark as read", id)}
                  onDismiss={(id) => console.log("Dismiss notification", id)}
                />
              )}
            </div>
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
                onClick={() => setShowUpgradeDialog(false)}
              >
                Upgrade Now - $39
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
};

export default Home;
