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
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

  // Update local tasks when props change and ensure they're immediately draggable
  React.useEffect(() => {
    setLocalTasks(tasks);
    
    // Force a re-render to ensure drag handlers are properly attached
    if (cardRef.current) {
      // Immediate attempt
      window.dispatchEvent(new Event("dragHandlersUpdate"));
      
      // Use requestAnimationFrame for better timing with DOM updates
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("dragHandlersUpdate"));
      });
    }
  }, [tasks]);

  // Listen for task-added events to ensure new tasks are draggable
  React.useEffect(() => {
    const handleTaskAdded = (event: CustomEvent) => {
      try {
        const { taskId, assignmentId } = event.detail;
        
        if (assignmentId === id) {
          // Force a re-render with the current tasks
          // This is critical for drag functionality to be initialized
          setLocalTasks(prevTasks => [...prevTasks]);
        }
      } catch (error) {
        console.error("Error handling task-added event:", error);
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

  // Listen for task-toggled-in-focus events to update tasks completed in Focus mode
  React.useEffect(() => {
    const handleTaskToggledInFocus = (event: CustomEvent) => {
      try {
        const { taskId, assignmentId, completed } = event.detail;
        
        if (assignmentId === id) {
          console.log("Assignment card received task-toggled-in-focus event:", event.detail);
          
          // Update the local task state directly
          setLocalTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === taskId ? { ...task, completed: completed } : task
            )
          );
          
          // Force a rerender by incrementing the counter
          setForceUpdateCounter(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error handling task-toggled-in-focus event:", error);
      }
    };

    // Add event listener
    window.addEventListener("task-toggled-in-focus", handleTaskToggledInFocus as EventListener);

    // Clean up
    return () => {
      window.removeEventListener(
        "task-toggled-in-focus",
        handleTaskToggledInFocus as EventListener,
      );
    };
  }, [id]);

  // Listen for calendar-tasks-updated events to refresh the card
  React.useEffect(() => {
    const handleCalendarTasksUpdated = () => {
      console.log("Assignment card received calendar-tasks-updated event, refreshing tasks for:", id);
      
      // Force refresh of local tasks from props
      setLocalTasks([...tasks]);
      
      // Force a rerender by incrementing the counter
      setForceUpdateCounter(prev => prev + 1);
    };

    window.addEventListener("calendar-tasks-updated", handleCalendarTasksUpdated);

    return () => {
      window.removeEventListener("calendar-tasks-updated", handleCalendarTasksUpdated);
    };
  }, [id, tasks]);

  // Debug logging for the force update counter
  React.useEffect(() => {
    console.log(`Assignment card ${id} force updated, counter: ${forceUpdateCounter}`);
  }, [forceUpdateCounter, id]);

  // Calculate completed tasks considering both local task state and calendar task state
  const completedTasks = localTasks.filter((task) => {
    // Check if task is completed in local state
    if (task.completed) return true;
    
    // Also check if task is completed in calendar tasks
    const calendarTask = calendarTasks.find(ct => ct.id === task.id);
    
    // Debug individual task completion status
    console.log(`Task ${task.id} "${task.title}": Local completed=${task.completed}, Calendar completed=${calendarTask?.completed || false}`);
    
    return calendarTask ? calendarTask.completed : false;
  }).length;
  
  const progress = localTasks.length > 0 ? (completedTasks / localTasks.length) * 100 : 0;
  
  // Debug logging for progress calculation
  console.log(`Assignment ${id} progress: ${completedTasks}/${localTasks.length} = ${progress.toFixed(2)}%`);
  
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
                // Create a unique key for this task instance
                const taskKey = `${task.id}-${taskIndex}`;
                
                return (
                  <TaskItem 
                    key={taskKey}
                    task={task}
                    taskIndex={taskIndex}
                    assignmentId={id}
                    assignmentTitle={title}
                    calendarTasks={calendarTasks}
                    onTaskToggle={onTaskToggle}
                  />
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

// Extract TaskItem as a separate component to ensure proper drag initialization
const TaskItem = React.memo(({ 
  task, 
  taskIndex, 
  assignmentId, 
  assignmentTitle,
  calendarTasks,
  onTaskToggle
}: { 
  task: Task; 
  taskIndex: number; 
  assignmentId: string;
  assignmentTitle: string;
  calendarTasks: CalendarTask[];
  onTaskToggle: (taskId: string) => void;
}) => {
  // Create a ref for the task element
  const taskElementRef = React.useRef<HTMLDivElement>(null);
  const gripRef = React.useRef<HTMLDivElement>(null);
  
  // Safely use useDrag only if we're in a DndProvider context
  let dragRef: any = null;
  let isDragging = false;

  // Wrap useDrag in a try-catch to handle cases where DndProvider context is missing
  try {
    // For dragging to calendar
    const [dragResult, drag] = useDrag(
      () => ({
        type: "task",
        item: {
          ...task,
          assignmentId,
          assignmentTitle,
          id: task.id,
          title: task.title,
          completed: task.completed,
          index: taskIndex,
          type: "task", // Explicitly set the type property
          duration: task.duration || 30, // Ensure duration is set
        },
        canDrag: true, // Allow all tasks to be dragged
        collect: (monitor) => ({
          isDragging: !!monitor.isDragging(),
        }),
        end: (item, monitor) => {
          // Log when drag ends
          console.log("Drag ended", item, monitor.didDrop());
          if (!monitor.didDrop()) {
            console.log("Item was not dropped on a valid target");
          }
          
          // Hide the placeholder
          const placeholderTask = document.getElementById("calendar-task-placeholder");
          if (placeholderTask) {
            placeholderTask.style.display = "none";
          }
        },
        options: {
          dropEffect: 'copy',
        },
      }),
      [task.id, task.title, task.completed, assignmentId, assignmentTitle, taskIndex, calendarTasks],
    );

    dragRef = drag;
    isDragging = dragResult.isDragging;
  } catch (error) {
    console.log("DnD not available in this context", error);
    dragRef = null;
    isDragging = false;
  }
  
  // Apply the drag ref to the task element when it's available
  React.useEffect(() => {
    console.log("TaskItem useEffect - task:", task.id, "dragRef:", !!dragRef, "taskElementRef.current:", !!taskElementRef.current);
    if (dragRef && taskElementRef.current) {
      console.log("Applying drag ref to task element:", task.id);
      dragRef(taskElementRef.current);
    }
  }, [dragRef, task.id]);

  // Check if there's a corresponding calendar task and if it's completed
  const calendarTask = calendarTasks.find(t => t.id === task.id);
  const isCompleted = task.completed || (calendarTask ? calendarTask.completed : false);

  return (
    <div
      ref={taskElementRef}
      data-task-id={task.id}
      className={`flex items-center justify-between space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 ${isDragging ? "opacity-50 task-dragging" : ""}`}
      style={{
        cursor: "grab",
      }}

    >
      <div className="flex items-center space-x-2 flex-grow">
        <Checkbox
          id={task.id}
          data-task-id={task.id}
          checked={isCompleted}
          onCheckedChange={() => onTaskToggle(task.id)}
        />
        <div className="flex items-center flex-grow">
          {calendarTasks.some(
            (calTask) => calTask.id === task.id,
          ) && (
            <div className="relative task-tooltip-trigger">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Find the calendar task with this ID to get all its details
                  const calendarTask = calendarTasks.find(calTask => calTask.id === task.id);
                  console.log("Calendar icon clicked for task:", task.id);
                  console.log("Calendar task found:", calendarTask);
                  console.log("Assignment ID:", assignmentId);
                  
                  if (!calendarTask || !calendarTask.date) {
                    console.error("Calendar task not found or missing date information");
                    return;
                  }
                  
                  // Make sure the calendar panel is visible
                  window.dispatchEvent(
                    new CustomEvent("show-calendar-panel", {
                      detail: { show: true },
                    })
                  );
                  
                  // Force the calendar to navigate to the correct date first
                  window.dispatchEvent(
                    new CustomEvent("navigate-calendar-to-date", {
                      detail: { 
                        date: calendarTask.date,
                        taskId: task.id
                      },
                    })
                  );
                  
                  // Short delay before dispatching the focus event
                  setTimeout(() => {
                    // Dispatch the event with all necessary information
                    window.dispatchEvent(
                      new CustomEvent("focus-calendar-task", {
                        detail: { 
                          taskId: task.id,
                          date: calendarTask.date,
                          startTime: calendarTask.startTime,
                          assignmentId: assignmentId,
                          assignmentTitle: assignmentTitle,
                          // Include additional information that might be helpful
                          taskTitle: task.title,
                          taskCompleted: task.completed,
                          taskDuration: calendarTask.duration || task.duration || 30,
                        },
                      }),
                    );
                    console.log("focus-calendar-task event dispatched");
                    
                    // As a fallback, try to directly access and highlight the task element
                    setTimeout(() => {
                      const taskElement = document.getElementById(`calendar-task-${task.id}`);
                      if (taskElement) {
                        console.log("Direct access - found task element:", taskElement);
                        
                        // Force a reflow
                        void taskElement.offsetHeight;
                        
                        // Remove any existing highlight classes first
                        document.querySelectorAll('.highlight-task').forEach(el => {
                          el.classList.remove('highlight-task');
                        });
                        
                        // Add highlight class
                        taskElement.classList.add("highlight-task");
                        
                        // Force another reflow
                        void taskElement.offsetHeight;
                        
                        // Apply inline styles as a backup
                        taskElement.style.boxShadow = "0 0 15px 5px rgba(59, 130, 246, 0.8)";
                        taskElement.style.zIndex = "50";
                        taskElement.style.border = "3px solid #3b82f6";
                        taskElement.style.backgroundColor = "rgba(59, 130, 246, 0.3)";
                        
                        // Scroll the task into view
                        taskElement.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                        
                        // Remove highlight after 3 seconds
                        setTimeout(() => {
                          taskElement.classList.remove("highlight-task");
                          // Reset inline styles
                          taskElement.style.boxShadow = "";
                          taskElement.style.zIndex = "";
                          taskElement.style.border = "";
                          taskElement.style.backgroundColor = "";
                        }, 3000);
                      }
                    }, 500);
                  }, 200);
                }}
                className="mr-1 text-primary hover:text-primary/80"
                aria-label="View in calendar"
              >
                <CalendarIcon className="h-3 w-3" />
              </button>
              
              {/* Tooltip showing date and time */}
              <div className="task-tooltip">
                <div className="task-tooltip-content">
                  {(() => {
                    const calendarTask = calendarTasks.find(calTask => calTask.id === task.id);
                    if (!calendarTask) return "Scheduled task";
                    
                    // Format the date
                    const dateObj = calendarTask.date ? new Date(calendarTask.date) : null;
                    const formattedDate = dateObj ? 
                      dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 
                      "Unknown date";
                    
                    // Format the time using the formatTime function if available
                    const formatTimeString = (timeStr: string) => {
                      // Simple 24h to 12h conversion if formatTime is not available
                      if (!timeStr) return "";
                      try {
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        const period = hours >= 12 ? 'PM' : 'AM';
                        const hours12 = hours % 12 || 12;
                        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
                      } catch (e) {
                        return timeStr;
                      }
                    };
                    
                    const startTime = calendarTask.startTime ? formatTimeString(calendarTask.startTime) : "Unknown time";
                    const endTime = calendarTask.endTime ? formatTimeString(calendarTask.endTime) : "";
                    const timeRange = endTime ? `${startTime} - ${endTime}` : startTime;
                    
                    return `📅 ${formattedDate} ⏰ ${timeRange}`;
                  })()}
                </div>
                <div className="task-tooltip-arrow-down"></div>
              </div>
            </div>
          )}
          <label
            htmlFor={task.id}
            className={`text-sm flex-grow ${isCompleted ? "line-through text-gray-500 dark:text-gray-400" : ""}`}
          >
            {task.title}
          </label>
        </div>
      </div>
      <div
        ref={gripRef}
        className="flex items-center self-stretch cursor-grab p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 task-drag-handle"
        title="Drag to calendar or reorder"
        onMouseDown={() => {
          console.log("GripVertical mouse down - task:", task.id);
          // Make the entire task element draggable
          if (dragRef && taskElementRef.current) {
            console.log("Making task element draggable:", task.id);
            dragRef(taskElementRef.current);
          }
        }}
      >
        <GripVertical
          className="h-4 w-4 text-gray-500 dark:text-gray-400"
          data-task-id={task.id}
        />
      </div>
    </div>
  );
});

export default AssignmentCard;

