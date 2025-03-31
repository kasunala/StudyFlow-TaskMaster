import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import AssignmentCard from "./AssignmentCard";
import { useDrop } from "react-dnd";

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

interface CalendarTask {
  id: string;
  title: string;
  completed: boolean;
  assignmentId: string;
  assignmentTitle: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  date?: string;
}

interface AssignmentGridProps {
  assignments?: Assignment[];
  calendarTasks?: CalendarTask[];
  onCreateAssignment?: () => void;
  onDeleteAssignment?: (id: string) => void;
  onTaskToggle?: (assignmentId: string, taskId: string, forceState?: boolean) => void;
  onUpdateAssignment?: (assignment: Assignment) => void;
}

interface DragItem {
  id: string;
  index: number;
  type: string;
}

const AssignmentGrid = ({
  assignments = [],
  calendarTasks = [],
  onCreateAssignment = () => {},
  onDeleteAssignment = () => {},
  onTaskToggle = () => {},
  onUpdateAssignment = () => {},
}: AssignmentGridProps) => {
  // State to track the order of assignments
  const [orderedAssignments, setOrderedAssignments] = useState<string[]>([]);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);
  const assignmentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Initialize ordered assignments if not already set and update current index when assignments change
  React.useEffect(() => {
    console.log("Assignments changed:", assignments);
    if (assignments.length > 0) {
      // If ordered assignments is empty, initialize it
      if (orderedAssignments.length === 0) {
        console.log("Initializing ordered assignments");
        setOrderedAssignments(assignments.map((a) => a.id));
      } else {
        // Check if there are new assignments not in the ordered list
        const newAssignments = assignments.filter(
          (a) => !orderedAssignments.includes(a.id),
        );
        console.log("New assignments:", newAssignments);
        if (newAssignments.length > 0) {
          // Add new assignments to the beginning of the list
          const newOrderedAssignments = [
            ...newAssignments.map((a) => a.id),
            ...orderedAssignments,
          ];
          console.log(
            "Setting new ordered assignments:",
            newOrderedAssignments,
          );
          setOrderedAssignments(newOrderedAssignments);
          // Set current index to 0 to show the newest assignment
          setCurrentAssignmentIndex(0);
        }
      }
    }
  }, [assignments]); // Remove orderedAssignments from dependencies to prevent circular updates

  // Assignment cards are no longer draggable, so we don't need these functions
  const moveAssignment = (dragIndex: number, hoverIndex: number) => {
    // Function kept for compatibility but no longer used
    console.log("moveAssignment no longer used");
  };

  let isOver = false;
  let isDragging = false;

  // Get assignments in the correct order
  const getOrderedAssignments = () => {
    if (orderedAssignments.length === 0) return assignments;

    // Create a map for quick lookup
    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    // Return assignments in the saved order, filtering out any that don't exist anymore
    const result = orderedAssignments
      .filter((id) => assignmentMap.has(id))
      .map((id) => assignmentMap.get(id)!);

    // Check if we have all assignments
    if (result.length < assignments.length) {
      // Find assignments that aren't in the ordered list yet
      const missingAssignments = assignments.filter(
        (a) => !orderedAssignments.includes(a.id),
      );

      // Add them to the beginning of the result
      return [...missingAssignments, ...result];
    }

    return result;
  };

  // Find the index of an assignment in the ordered list
  const findAssignmentIndex = (id: string) => {
    return orderedAssignments.indexOf(id);
  };

  // Get the ordered assignments list
  const orderedAssignmentsList = getOrderedAssignments();
  console.log("Ordered assignments list:", orderedAssignmentsList);

  // Make sure currentAssignmentIndex is valid
  React.useEffect(() => {
    console.log("Checking current index validity:", {
      currentIndex: currentAssignmentIndex,
      listLength: orderedAssignmentsList.length,
    });
    if (orderedAssignmentsList.length > 0) {
      if (currentAssignmentIndex >= orderedAssignmentsList.length) {
        console.log("Resetting current index to 0");
        setCurrentAssignmentIndex(0);
      }
    }
  }, [orderedAssignmentsList.length, currentAssignmentIndex]);

  // Get the current assignment safely
  const currentAssignment =
    orderedAssignmentsList.length > 0
      ? orderedAssignmentsList[
          Math.min(currentAssignmentIndex, orderedAssignmentsList.length - 1)
        ]
      : null;

  console.log("Current assignment:", currentAssignment);

  const goToNextAssignment = () => {
    if (currentAssignmentIndex < orderedAssignmentsList.length - 1) {
      setCurrentAssignmentIndex(currentAssignmentIndex + 1);
    }
  };

  const goToPreviousAssignment = () => {
    if (currentAssignmentIndex > 0) {
      setCurrentAssignmentIndex(currentAssignmentIndex - 1);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Assignments
          </h2>
          <Button
            onClick={() => {
              console.log("New Assignment button clicked");
              onCreateAssignment();
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Assignment
          </Button>
        </div>

        {assignments.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl mx-auto mb-8">
              {currentAssignment && (
                <AssignmentCard
                  id={currentAssignment.id}
                  index={currentAssignmentIndex}
                  title={currentAssignment.title}
                  description={currentAssignment.description}
                  dueDate={currentAssignment.dueDate}
                  tasks={currentAssignment.tasks}
                  calendarTasks={calendarTasks.filter(
                    (task) => task.assignmentId === currentAssignment.id,
                  )}
                  onDelete={() => onDeleteAssignment(currentAssignment.id)}
                  onTaskToggle={(taskId) =>
                    onTaskToggle(currentAssignment.id, taskId)
                  }
                  onUpdateAssignment={(updatedAssignment) =>
                    onUpdateAssignment({
                      ...updatedAssignment,
                      id: currentAssignment.id,
                    })
                  }
                  moveAssignment={moveAssignment}
                  findAssignmentIndex={findAssignmentIndex}
                />
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center space-x-4 mt-4 w-full">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousAssignment}
                disabled={currentAssignmentIndex === 0}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center space-x-2">
                {orderedAssignmentsList.map((_, index) => (
                  <Button
                    key={index}
                    variant={
                      index === currentAssignmentIndex ? "default" : "outline"
                    }
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentAssignmentIndex(index)}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={goToNextAssignment}
                disabled={
                  currentAssignmentIndex === orderedAssignmentsList.length - 1
                }
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-center mt-2 text-sm text-muted-foreground">
              Assignment {currentAssignmentIndex + 1} of{" "}
              {orderedAssignmentsList.length}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-card text-card-foreground rounded-lg shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No assignments yet
            </p>
            <Button
              onClick={() => {
                console.log("Create first assignment button clicked");
                onCreateAssignment();
              }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Create your first assignment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentGrid;
