export type TaskStatus = "pending" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

export interface TaskUpdate {
  title?: string;
  status?: TaskStatus;
}
