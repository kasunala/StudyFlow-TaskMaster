import React, { useState, useRef } from "react";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  GripVertical,
  Calendar as CalendarIcon,
} from "lucide-react";
import EditAssignmentDialog from "./EditAssignmentDialog";
import { useDrag, useDrop } from "react-dnd";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration?: number; // Duration in minutes
}

interface CalendarTask extends Task {
  assignmentId: string;
  assignmentTitle: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  date?: string;
}

interface AssignmentCardProps {
  id?: string;
  index?: number;
  title?: string;
  description?: string;
  dueDate?: string;
  tasks?: Task[];
  calendarTasks?: CalendarTask[];
  onTaskToggle?: (taskId: string) => void;
  onDelete?: () => void;
  onUpdateAssignment?: (assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    tasks: Task[];
  }) => void;
  moveAssignment?: (dragIndex: number, hoverIndex: number) => void;
  findAssignmentIndex?: (id: string) => number;
}

interface DragItem {
  id: string;
  index: number;
  type: string;
}

const AssignmentCard = ({
  id = "",
  index = 0,
  title = "Sample Assignment",
  description = "This is a sample assignment description",
  dueDate = "2024-04-30",
  tasks = [
    { id: "1", title: "Warm-up task", completed: false },
    { id: "2", title: "Research materials", completed: true },
    { id: "3", title: "Write first draft", completed: false },
  ],
  calendarTasks = [],
  onTaskToggle = () => {},
  onDelete = () => {},
  onUpdateAssignment = () => {},
  moveAssignment = () => {},
  findAssignmentIndex = () => -1,
}: AssignmentCardProps) => {
  const { formatTime } = useTimeFormat();
  const [isOpen, setIsOpen] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Update local tasks when props change and ensure they're immediately draggable
  React.useEffect(() => {
    setLocalTasks(tasks);
    // Force a re-render to ensure drag handlers are properly attached
    if (cardRef.current) {
      // Immediate attempt
      window.dispatchEvent(new Event("dragHandlersUpdate"));

      // Multiple attempts with increasing delays to ensure handlers are attached
      for (let delay of [10, 50, 100, 200, 500, 1000]) {
        setTimeout(() => {
          window.dispatchEvent(new Event("dragHandlersUpdate"));
        }, delay);
      }
    }
  }, [tasks]);

  // Listen for task-added events to ensure new tasks are draggable
  React.useEffect(() => {
    const handleTaskAdded = (event: CustomEvent) => {
      const { taskId, assignmentId } = event.detail;
      if (assignmentId === id) {
        console.log("Task added event received for task:", taskId);
        // Force re-initialization of drag handlers immediately
        window.dispatchEvent(new Event("dragHandlersUpdate"));

        // Multiple attempts with increasing delays and shorter initial delay
        for (let delay of [10, 50, 100, 200, 500, 1000]) {
          setTimeout(() => {
            console.log(
              `Updating drag handlers after ${delay}ms for task:`,
              taskId,
            );
            window.dispatchEvent(new Event("dragHandlersUpdate"));

            // Try to find the task element and manually initialize it
            const taskElement = document.querySelector(
              `[data-task-id="${taskId}"]`,
            );
            if (taskElement) {
              console.log(
                "Found task element, ensuring it's draggable:",
                taskElement,
              );
              // Force a reflow
              void taskElement.offsetHeight;
            }
          }, delay);
        }
      }
    };

    // Add event listener
    window.addEventListener("task-added", handleTaskAdded as EventListener);

    // Clean up
    return () => {
      window.removeEventListener(
        "task-added",
        handleTaskAdded as EventListener,
      );
    };
  }, [id]);

  // Assignment cards are no longer draggable
  const completedTasks = localTasks.filter((task) => task.completed).length;
  const progress = (completedTasks / localTasks.length) * 100;

  // Function to move a task from one position to another
  const moveTask = (fromIndex: number, toIndex: number) => {
    const updatedTasks = [...localTasks];
    const [movedTask] = updatedTasks.splice(fromIndex, 1);
    updatedTasks.splice(toIndex, 0, movedTask);

    setLocalTasks(updatedTasks);

    // Update the assignment with the new task order
    onUpdateAssignment({
      id,
      title,
      description,
      dueDate,
      tasks: updatedTasks,
    });
  };

  return (
    <Card
      ref={cardRef}
      className="w-full bg-card text-card-foreground shadow-lg"
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div>
              <CardTitle className="text-xl font-bold">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEditDialog(true)}
            className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
          >
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Due: {new Date(dueDate).toLocaleDateString()}
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex w-full justify-between p-2 hover:bg-muted/50"
            >
              <span>
                Tasks ({completedTasks}/{localTasks.length})
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2 max-h-[200px] overflow-y-auto">
              {localTasks.map((task, taskIndex) => {
                // Safely use useDrag only if we're in a DndProvider context
                let dragRef: any = null;
                let isDragging = false;

                // Wrap useDrag in a try-catch to handle cases where DndProvider context is missing
                try {
                  // For dragging to calendar
                  const [dragResult, drag] = useDrag(
                    () => ({
                      type: "task",
                      item: (monitor) => {
                        // Add visual feedback when drag starts
                        const taskElement = document.querySelector(
                          `[data-task-id="${task.id}"]`,
                        )?.parentElement;
                        if (taskElement) {
                          taskElement.classList.add(
                            "scale-95",
                            "ring-2",
                            "ring-primary/50",
                            "bg-primary/5",
                          );
                        }

                        return {
                          ...task,
                          assignmentId: id,
                          assignmentTitle: title,
                          // Make sure these properties are included for newly added tasks
                          id: task.id,
                          title: task.title,
                          completed: task.completed,
                          index: taskIndex, // Include the task index for proper ordering
                        };
                      },
                      canDrag: true, // Allow dragging for all tasks
                      collect: (monitor) => ({
                        isDragging: !!monitor.isDragging(),
                      }),
                      end: (item, monitor) => {
                        // Log when drag ends to help debug
                        console.log(
                          "Drag ended for task:",
                          item.id,
                          "Dropped:",
                          monitor.didDrop(),
                        );

                        // Remove visual feedback when drag ends
                        const taskElement = document.querySelector(
                          `[data-task-id="${task.id}"]`,
                        )?.parentElement;
                        if (taskElement) {
                          taskElement.classList.remove(
                            "scale-95",
                            "ring-2",
                            "ring-primary/50",
                            "bg-primary/5",
                          );
                        }
                      },
                    }),

                    // Dependencies that affect the drag behavior
                    [
                      task.id,
                      task.title,
                      task.completed,
                      id,
                      title,
                      taskIndex, // Add taskIndex as a dependency
                    ],
                  );

                  dragRef = drag;
                  isDragging = dragResult.isDragging;
                } catch (error) {
                  // Silently handle the error when DndProvider context is missing
                  console.log("DnD not available in this context", error);
                  dragRef = null;
                  isDragging = false;
                }

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${isDragging ? "opacity-50 scale-95 ring-2 ring-primary/50 bg-primary/5" : "transition-all duration-200"}`}
                    style={{
                      cursor: calendarTasks.some(
                        (calTask) => calTask.id === task.id,
                      )
                        ? "default"
                        : "grab",
                    }}
                  >
                    <div className="flex items-center space-x-2 flex-grow">
                      <Checkbox
                        id={task.id}
                        checked={task.completed}
                        onCheckedChange={() => onTaskToggle(task.id)}
                      />
                      <div className="flex items-center flex-grow">
                        {calendarTasks.some(
                          (calTask) => calTask.id === task.id,
                        ) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();

                              // Find the calendar task
                              const calTask = calendarTasks.find(
                                (ct) => ct.id === task.id,
                              );
                              if (!calTask) {
                                console.error(
                                  "Calendar task not found for ID:",
                                  task.id,
                                );
                                return;
                              }

                              // Show tooltip with date and time information
                              const dateStr = calTask.date
                                ? new Date(calTask.date).toLocaleDateString()
                                : "";
                              const timeStr = calTask.startTime
                                ? formatTime(calTask.startTime)
                                : "";
                              alert(
                                `Task scheduled for: ${dateStr} at ${timeStr}`,
                              );
                            }}
                            className="mr-2 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full p-1"
                            aria-label="View in calendar"
                            title={`Scheduled: ${calendarTasks.find((calTask) => calTask.id === task.id)?.date ? new Date(calendarTasks.find((calTask) => calTask.id === task.id)?.date || "").toLocaleDateString() : ""} ${calendarTasks.find((calTask) => calTask.id === task.id)?.startTime ? `at ${formatTime(calendarTasks.find((calTask) => calTask.id === task.id)?.startTime || "")}` : ""}`}
                          >
                            <CalendarIcon className="h-3 w-3 text-blue-500" />
                          </button>
                        )}
                        <label
                          htmlFor={task.id}
                          className={`text-sm ${task.completed ? "line-through text-gray-400 dark:text-gray-500" : "text-foreground"}`}
                        >
                          {task.title}
                        </label>
                      </div>
                    </div>
                    <div
                      ref={dragRef}
                      className={`flex items-center self-stretch cursor-grab p-1 rounded-md ${isDragging ? "bg-primary/20" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                      title="Drag to calendar or reorder"
                      data-task-id={task.id}
                    >
                      <GripVertical
                        className={`h-4 w-4 ${isDragging ? "text-primary" : "text-gray-400 dark:text-gray-500"} flex-shrink-0 transition-colors duration-200`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="flex justify-end pt-0">
        {/* Footer content removed */}
      </CardFooter>

      <EditAssignmentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        assignment={{
          id,
          title,
          description,
          dueDate,
          tasks,
        }}
        onSave={onUpdateAssignment}
      />
    </Card>
  );
};

export default AssignmentCard;
