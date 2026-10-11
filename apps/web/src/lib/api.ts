import { getToken } from "./auth";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
export async function api<T>(
  path: string,
  init: RequestInit = {},
  anonymous = false,
): Promise<T> {
  if (process.env.NEXT_PUBLIC_PLAYGROUND === "true") {
    const { previewApi } = await import("./preview-api");
    return previewApi<T>(path, init);
  }
  const token = anonymous ? null : await getToken();
  const response = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && !anonymous) {
      window.location.assign(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login/`,
      );
    }
    throw new Error(body.error || "Unable to complete request");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});
export type User = { id: string; email: string; role: "student" | "mentor" };
export type Goal = {
  id: number;
  owner_id: string;
  owner_email: string;
  title: string;
  description: string;
  total_steps: number;
  completed_steps: number;
};
export type Relationship = {
  id: number;
  mentor_email: string;
  student_email: string;
  status: "pending" | "accepted";
};
export type Grow = {
  goal: string;
  reality: string;
  options: string;
  will: string;
};
export type Detail = Goal & {
  grow: Grow;
  steps: { id: number; description: string; completed: boolean }[];
  checkpoints: {
    id: number;
    month: string;
    updated_at?: string;
    notes: string;
  }[];
  feedback: {
    id: number;
    mentor_email: string;
    body: string;
    created_at: string;
  }[];
};
export type Overview = {
  stats: {
    goals: number;
    steps: number;
    completed_steps: number;
    feedback: number;
  };
  feedback: {
    id: number;
    goal_id: number;
    body: string;
    created_at: string;
    title: string;
    mentor_email: string;
  }[];
  checkpoints: {
    id: number;
    goal_id: number;
    notes: string;
    month: string;
    updated_at: string;
    title: string;
  }[];
  nextSteps: {
    id: number;
    goal_id: number;
    description: string;
    title: string;
  }[];
};
