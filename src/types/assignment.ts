export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  tasks: Task[];
}
