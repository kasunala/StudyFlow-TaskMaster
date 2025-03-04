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
import { Calendar, X, GripVertical, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: string;
  title: string;
  completed: boolean;
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
  const [tasks, setTasks] = useState<Task[]>([...assignment.tasks]);
  const [newTask, setNewTask] = useState("");

  const handleAddTask = () => {
    if (newTask.trim()) {
      // Create a new task with a unique ID
      const newTaskId = `task-${Date.now()}`;
      const updatedTasks = [
        ...tasks,
        { id: newTaskId, title: newTask, completed: false },
      ];
      setTasks(updatedTasks);
      setNewTask("");

      // Immediately update the parent component to refresh the assignment card
      if (title && dueDate) {
        onSave({
          id: assignment.id,
          title,
          description,
          dueDate,
          tasks: updatedTasks,
        });

        // Dispatch a custom event to notify that a new task was added
        // This can be used to trigger any additional UI updates if needed
        window.dispatchEvent(
          new CustomEvent("task-added", {
            detail: {
              taskId: newTaskId,
              assignmentId: assignment.id,
              index: updatedTasks.length - 1,
            },
          }),
        );

        // Force re-initialization of drag handlers with multiple attempts
        // First immediate attempt
        window.dispatchEvent(new Event("dragHandlersUpdate"));

        // Multiple attempts with increasing delays to ensure handlers are attached
        for (let delay of [50, 100, 200, 500, 1000]) {
          setTimeout(() => {
            window.dispatchEvent(new Event("dragHandlersUpdate"));
          }, delay);
        }
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

    onSave({
      id: assignment.id,
      title,
      description,
      dueDate,
      tasks,
    });

    onOpenChange(false);
  };

  return (
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
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tasks</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <GripVertical className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                  <div className="flex items-center space-x-2 flex-1">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-500"
                    onClick={() => handleRemoveTask(task.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
                    _delete: true,
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
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
  );
};

export default EditAssignmentDialog;
