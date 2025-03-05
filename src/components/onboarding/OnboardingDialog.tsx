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
import { Textarea } from "@/components/ui/textarea";
import { Calendar, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAssignment: (assignment: {
    title: string;
    description: string;
    dueDate: string;
    tasks: { id: string; title: string; completed: boolean }[];
  }) => Promise<void> | void;
}

const OnboardingDialog = ({
  open,
  onOpenChange,
  onCreateAssignment,
}: OnboardingDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tasks, setTasks] = useState([
    { id: "1", title: "Warm-up task", completed: false },
  ]);
  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks([
        ...tasks,
        { id: Date.now().toString(), title: newTask, completed: false },
      ]);
      setNewTask("");
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
      setTasks([{ id: "1", title: "Warm-up task", completed: false }]);

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating assignment:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Welcome to TaskMaster!</DialogTitle>
          <DialogDescription>
            Let's create your first assignment to get started.
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
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tasks</Label>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <GripVertical className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                  <div className="flex items-center space-x-2 flex-1">
                    <Checkbox id={`task-${task.id}`} />
                    <Label
                      htmlFor={`task-${task.id}`}
                      className="cursor-pointer"
                    >
                      {task.title}
                    </Label>
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
  );
};

export default OnboardingDialog;
