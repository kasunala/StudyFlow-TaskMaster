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
import { Calendar, Clock, GripVertical, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import TimeSelectionDialog from "./TimeSelectionDialog";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration?: number; // Duration in minutes
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  tasks: Task[];
}

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
  onSave: (updatedAssignment: Assignment) => void;
}

const EditAssignmentDialog = ({
  open,
  onOpenChange,
  assignment,
  onSave,
}: EditAssignmentDialogProps) => {
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description);
  const [dueDate, setDueDate] = useState(assignment.dueDate);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeSelectionOpen, setTimeSelectionOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Initialize tasks when the dialog opens
  React.useEffect(() => {
    if (open) {
      setTasks([...assignment.tasks]);
      setTitle(assignment.title);
      setDescription(assignment.description);
      setDueDate(assignment.dueDate);
    }
  }, [
    open,
    assignment.tasks,
    assignment.title,
    assignment.description,
    assignment.dueDate,
  ]);
  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (newTask.trim()) {
      try {
        // Create a new task with a unique ID and default duration of 30 minutes
        const newTaskId = `task-${Date.now()}`;
        const updatedTasks = [
          ...tasks,
          { id: newTaskId, title: newTask, completed: false, duration: 30 },
        ];
        setTasks(updatedTasks);
        setNewTask("");

        // Immediately update the parent component to refresh the assignment card
        if (title && dueDate) {
          // Save first to ensure the task is added to the assignment
          onSave({
            id: assignment.id,
            title,
            description,
            dueDate,
            tasks: updatedTasks,
          });

          // Dispatch the task-added event after a short delay to allow the DOM to update
          setTimeout(() => {
            try {
              window.dispatchEvent(
                new CustomEvent("task-added", {
                  detail: {
                    taskId: newTaskId,
                    assignmentId: assignment.id,
                    index: updatedTasks.length - 1,
                  },
                })
              );
            } catch (error) {
              console.error("Error dispatching task-added event:", error);
            }
          }, 50);
        }
      } catch (error) {
        console.error("Error adding task:", error);
      }
    }
  };

  const handleRemoveTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          return { ...task, completed: !task.completed };
        }
        return task;
      }),
    );
  };

  const handleSubmit = () => {
    if (!title || !dueDate) return;

    // Save the assignment
    onSave({
      id: assignment.id,
      title,
      description,
      dueDate,
      tasks,
    });

    // Trigger drag handlers update
    setTimeout(() => {
      window.dispatchEvent(new Event("dragHandlersUpdate"));
    }, 100);

    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update your assignment details and tasks.
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
                    if (dueDate) {
                      datePicker.value = dueDate;
                    }

                    // Handle date selection
                    datePicker.addEventListener("change", (e) => {
                      setDueDate(datePicker.value);
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
              <Label>Tasks</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col p-2 border rounded-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`task-${task.id}`}
                              checked={task.completed}
                              onCheckedChange={() => handleToggleTask(task.id)}
                            />
                            <Label
                              htmlFor={`task-${task.id}`}
                              className={`cursor-pointer ${task.completed ? "line-through text-gray-400" : ""}`}
                            >
                              {task.title}
                            </Label>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-500"
                          onClick={() => handleRemoveTask(task.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-500">
                    No tasks yet. Add your first task below.
                  </div>
                )}
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

          <DialogFooter className="flex justify-between">
            <div className="flex-1 flex justify-start">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to delete this assignment? This action cannot be undone.",
                    )
                  ) {
                    onOpenChange(false);
                    onSave({
                      id: assignment.id,
                      title: "",
                      description: "",
                      dueDate: "",
                      tasks: [],
                    });
                  }
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={!title || !dueDate}
            >
              Save Changes
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

export default EditAssignmentDialog;
