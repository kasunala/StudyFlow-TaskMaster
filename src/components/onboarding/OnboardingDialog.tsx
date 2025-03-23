import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, GripVertical, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useAssignments } from "@/contexts/AssignmentContext";
import TimeSelectionDialog from "@/components/dashboard/TimeSelectionDialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAssignment: (assignment: {
    title: string;
    description: string;
    dueDate: string;
    tasks: {
      id: string;
      title: string;
      completed: boolean;
      duration?: number;
    }[];
  }) => Promise<void> | void;
}

const OnboardingDialog = ({
  open,
  onOpenChange,
  onCreateAssignment,
}: OnboardingDialogProps) => {
  const { assignments } = useAssignments();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [isFirstAssignment, setIsFirstAssignment] = useState(true);
  const [timeSelectionOpen, setTimeSelectionOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Check if this is the first assignment
  useEffect(() => {
    if (assignments && assignments.length > 0) {
      setIsFirstAssignment(false);
    } else {
      setIsFirstAssignment(true);
    }
  }, [assignments]);

  const handleAddTask = () => {
    if (newTask.trim()) {
      const newTaskId = Date.now().toString();
      const updatedTasks = [
        ...tasks,
        { id: newTaskId, title: newTask, completed: false, duration: 30 },
      ];
      setTasks(updatedTasks);
      setNewTask("");

      // Dispatch event to ensure drag handlers are initialized immediately
      window.dispatchEvent(new Event("dragHandlersUpdate"));

      // Dispatch a custom event for the new task
      window.dispatchEvent(
        new CustomEvent("task-added", {
          detail: {
            taskId: newTaskId,
            index: updatedTasks.length - 1,
          },
        }),
      );

      // Multiple attempts with increasing delays to ensure handlers are attached
      // Start with a very short delay for quicker response
      for (let delay of [10, 50, 100, 200, 500, 1000]) {
        setTimeout(() => {
          window.dispatchEvent(new Event("dragHandlersUpdate"));
          // Re-dispatch the task-added event to ensure it's caught
          window.dispatchEvent(
            new CustomEvent("task-added", {
              detail: {
                taskId: newTaskId,
                index: updatedTasks.length - 1,
              },
            }),
          );
        }, delay);
      }
    }
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleSubmit = async () => {
    if (!title || !dueDate) {
      console.log("Form validation failed", { title, dueDate });
      return;
    }

    console.log("Submitting assignment", {
      title,
      description,
      dueDate,
      tasks,
    });

    try {
      await onCreateAssignment({
        title,
        description,
        dueDate,
        tasks,
      });

      console.log("Assignment created successfully");

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setTasks([]);

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Welcome to AssignmentDays!</DialogTitle>
            <DialogDescription>
              {isFirstAssignment
                ? "Let's create your first assignment to get started."
                : "Create a new assignment"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                placeholder="Math Homework"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Complete exercises 1-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="flex">
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1"
                />
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="ml-2"
                      type="button"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      initialFocus
                      selected={dueDate ? new Date(dueDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          // Format date as YYYY-MM-DD
                          const formattedDate = format(date, "yyyy-MM-dd");
                          setDueDate(formattedDate);
                          setCalendarOpen(false);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tasks</Label>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col p-2 border rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`task-${task.id}`} />
                          <Label
                            htmlFor={`task-${task.id}`}
                            className="cursor-pointer"
                          >
                            {task.title}
                          </Label>
                        </div>
                      </div>
                      {task.title !== "Warm-up task" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTask(task.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="mt-2 pl-6 flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs justify-start"
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          setTimeSelectionOpen(true);
                        }}
                      >
                        Duration: {task.duration || 30} minutes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex mt-2">
                <Input
                  placeholder="Add a new task"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="ml-2"
                  onClick={handleAddTask}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                console.log("Create Assignment button clicked");
                try {
                  await handleSubmit();
                  console.log("Assignment created successfully");
                } catch (error) {
                  console.error("Error creating assignment:", error);
                }
              }}
              disabled={!title || !dueDate}
            >
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Selection Dialog */}
      {selectedTaskId && (
        <TimeSelectionDialog
          open={timeSelectionOpen}
          onOpenChange={setTimeSelectionOpen}
          initialDuration={tasks.find(t => t.id === selectedTaskId)?.duration || 30}
          taskTitle={tasks.find(t => t.id === selectedTaskId)?.title || ""}
          onSave={(duration) => {
            const updatedTasks = tasks.map((t) => {
              if (t.id === selectedTaskId) {
                return { ...t, duration };
              }
              return t;
            });
            setTasks(updatedTasks);
          }}
        />
      )}
    </>
  );
};

export default OnboardingDialog;
