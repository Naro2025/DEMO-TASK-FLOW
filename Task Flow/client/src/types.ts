export type TaskStatus = "pending" | "done";
export type TaskFilter = "all" | TaskStatus;

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}
