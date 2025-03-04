import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AssignmentCard from "./AssignmentCard";

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

interface AssignmentGridProps {
  assignments?: Assignment[];
  onCreateAssignment?: () => void;
  onDeleteAssignment?: (id: string) => void;
  onTaskToggle?: (assignmentId: string, taskId: string) => void;
  onUpdateAssignment?: (assignment: Assignment) => void;
}

const AssignmentGrid = ({
  assignments = [],
  onCreateAssignment = () => {},
  onDeleteAssignment = () => {},
  onTaskToggle = () => {},
  onUpdateAssignment = () => {},
}: AssignmentGridProps) => {
  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Assignments</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              id={assignment.id}
              title={assignment.title}
              description={assignment.description}
              dueDate={assignment.dueDate}
              tasks={assignment.tasks}
              onDelete={() => onDeleteAssignment(assignment.id)}
              onTaskToggle={(taskId) => onTaskToggle(assignment.id, taskId)}
              onUpdateAssignment={(updatedAssignment) =>
                onUpdateAssignment({ ...updatedAssignment, id: assignment.id })
              }
            />
          ))}
        </div>

        {assignments.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 mb-4">No assignments yet</p>
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
