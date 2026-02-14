import type {
  Week,
  Task,
  TaskWithCategory,
  Category,
  RecurringTask,
  Note,
  Attachment,
  BacklogItem,
  FollowUp,
  WeightEntry,
  WeekGenerationData,
  GenerateWeekPayload,
} from '@/types'

const API_BASE = '/api'

let currentUser: { id: string; email: string } | null = null

export function setApiUser(user: { id: string; email: string } | null) {
  currentUser = user
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (currentUser) {
    headers['x-user-id'] = currentUser.id
    headers['x-user-email'] = currentUser.email
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Health API
export const healthApi = {
  getWeightEntries: (days = 90) =>
    request<WeightEntry[]>(`/health-weight?days=${days}`),
}

// Weeks API
export const weeksApi = {
  list: () => request<Week[]>('/goals-weeks'),
  get: (id: string) => request<Week>(`/goals-weeks/${id}`),
  create: (data: Partial<Week>) =>
    request<Week>('/goals-weeks', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/goals-weeks/${id}`, { method: 'DELETE' }),
}

// Tasks API
export const tasksApi = {
  listByWeek: (weekId: string) =>
    request<TaskWithCategory[]>(`/goals-weeks/${weekId}/tasks`),
  get: (id: number) => request<TaskWithCategory>(`/goals-tasks/${id}`),
  create: (data: Partial<Task>) =>
    request<Task>('/goals-tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Task>) =>
    request<Task>(`/goals-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/goals-tasks/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: number) =>
    request<Task>(`/goals-tasks/${id}/toggle`, { method: 'POST' }),
  moveToBacklog: (id: number) =>
    request<BacklogItem>(`/goals-tasks/${id}/to-backlog`, { method: 'POST' }),
}

// Categories API
export const categoriesApi = {
  list: () => request<Category[]>('/goals-categories'),
  create: (data: Partial<Category>) =>
    request<Category>('/goals-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Category>) =>
    request<Category>(`/goals-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/goals-categories/${id}`, { method: 'DELETE' }),
}

// Recurring Tasks API
export const recurringTasksApi = {
  list: () => request<RecurringTask[]>('/goals-recurring'),
  get: (id: number) => request<RecurringTask>(`/goals-recurring/${id}`),
  create: (data: Partial<RecurringTask>) =>
    request<RecurringTask>('/goals-recurring', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<RecurringTask>) =>
    request<RecurringTask>(`/goals-recurring/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/goals-recurring/${id}`, { method: 'DELETE' }),
  toggle: (id: number) =>
    request<RecurringTask>(`/goals-recurring/${id}/toggle`, { method: 'POST' }),
}

// Notes API
export const notesApi = {
  listByTask: (taskId: number) =>
    request<Note[]>(`/goals-tasks/${taskId}/notes`),
  listByBacklogItem: (backlogItemId: number) =>
    request<Note[]>(`/goals-backlog/${backlogItemId}/notes`),
  create: (data: Partial<Note>) =>
    request<Note>('/goals-notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Note>) =>
    request<Note>(`/goals-notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/goals-notes/${id}`, { method: 'DELETE' }),
}

// Attachments API
export const attachmentsApi = {
  listByNote: (noteId: number) =>
    request<Attachment[]>(`/goals-notes/${noteId}/attachments`),
  upload: async (noteId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('noteId', noteId.toString())

    const headers: Record<string, string> = {}
    if (currentUser) {
      headers['x-user-id'] = currentUser.id
      headers['x-user-email'] = currentUser.email
    }

    const response = await fetch(`${API_BASE}/goals-upload`, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(error.error)
    }

    return response.json() as Promise<Attachment>
  },
  delete: (id: number) =>
    request<void>(`/goals-attachments/${id}`, { method: 'DELETE' }),
  getUrl: (blobKey: string) => `${API_BASE}/goals-attachments/blob/${blobKey}`,
}

// Backlog API
export const backlogApi = {
  list: () => request<BacklogItem[]>('/goals-backlog'),
  get: (id: number) => request<BacklogItem>(`/goals-backlog/${id}`),
  create: (data: Partial<BacklogItem>) =>
    request<BacklogItem>('/goals-backlog', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<BacklogItem>) =>
    request<BacklogItem>(`/goals-backlog/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/goals-backlog/${id}`, { method: 'DELETE' }),
  moveToWeek: (id: number, weekId: string) =>
    request<Task>(`/goals-backlog/${id}/to-week`, {
      method: 'POST',
      body: JSON.stringify({ weekId }),
    }),
}

// Follow-ups API
export const followUpsApi = {
  list: () => request<FollowUp[]>('/goals-follow-ups'),
  create: (data: Partial<FollowUp>) =>
    request<FollowUp>('/goals-follow-ups', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/goals-follow-ups/${id}`, { method: 'DELETE' }),
}

// Week Generation API
export const weekGenerationApi = {
  getData: (previousWeekId?: string) =>
    request<WeekGenerationData>(
      previousWeekId ? `/goals-weeks-new/data/${previousWeekId}` : '/goals-weeks-new/data'
    ),
  generate: (payload: GenerateWeekPayload) =>
    request<Week>('/goals-weeks-new', { method: 'POST', body: JSON.stringify(payload) }),
}
