import type { Task, TaskStatus } from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const getTasks = () => request<Task[]>("/api/tasks");

export const createTask = (title: string) =>
  request<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title }),
  });

export const updateTask = (id: string, status: TaskStatus) =>
  request<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteTask = (id: string) =>
  request<void>(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
