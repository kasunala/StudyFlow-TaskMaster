export interface Task {
  id: string;
  title: string;
  completed: boolean;
  duration?: number; // Duration in minutes
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  tasks: Task[];
  _delete?: boolean;
}
