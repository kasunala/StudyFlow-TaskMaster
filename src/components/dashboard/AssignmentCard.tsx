import React, { useState } from "react";
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
import { ChevronDown, ChevronUp, Trash2, Edit } from "lucide-react";
import EditAssignmentDialog from "./EditAssignmentDialog";
import { useDrag } from "react-dnd";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface AssignmentCardProps {
  id?: string;
  title?: string;
  description?: string;
  dueDate?: string;
  tasks?: Task[];
  onTaskToggle?: (taskId: string) => void;
  onDelete?: () => void;
  onUpdateAssignment?: (assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    tasks: Task[];
  }) => void;
}

const AssignmentCard = ({
  id = "",
  title = "Sample Assignment",
  description = "This is a sample assignment description",
  dueDate = "2024-04-30",
  tasks = [
    { id: "1", title: "Warm-up task", completed: false },
    { id: "2", title: "Research materials", completed: true },
    { id: "3", title: "Write first draft", completed: false },
  ],
  onTaskToggle = () => {},
  onDelete = () => {},
  onUpdateAssignment = () => {},
}: AssignmentCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const completedTasks = tasks.filter((task) => task.completed).length;
  const progress = (completedTasks / tasks.length) * 100;

  return (
    <Card className="w-full bg-white shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-gray-500 hover:text-red-500"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Due: {new Date(dueDate).toLocaleDateString()}
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex w-full justify-between p-2 hover:bg-gray-100"
            >
              <span>
                Tasks ({completedTasks}/{tasks.length})
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 mt-2">
              {tasks.map((task) => {
                // Safely use useDrag only if we're in a DndProvider context
                let dragRef: any = null;
                let isDragging = false;

                try {
                  const [dragResult, drag] = useDrag(() => ({
                    type: "task",
                    item: { ...task, assignmentId: id, assignmentTitle: title },
                    collect: (monitor) => ({
                      isDragging: !!monitor.isDragging(),
                    }),
                  }));
                  dragRef = drag;
                  isDragging = dragResult.isDragging;
                } catch (error) {
                  console.log("DnD not available in this context");
                }

                return (
                  <div
                    key={task.id}
                    ref={dragRef}
                    className={`flex items-center space-x-2 p-2 rounded hover:bg-gray-50 ${isDragging ? "opacity-50" : ""}`}
                    style={{ cursor: "grab" }}
                  >
                    <Checkbox
                      id={task.id}
                      checked={task.completed}
                      onCheckedChange={() => onTaskToggle(task.id)}
                    />
                    <label
                      htmlFor={task.id}
                      className={`flex-grow text-sm ${task.completed ? "line-through text-gray-400" : ""}`}
                    >
                      {task.title}
                    </label>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="flex justify-end pt-0">
        <Button
          variant="outline"
          size="sm"
          className="text-sm"
          onClick={() => setShowEditDialog(true)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Assignment
        </Button>
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
