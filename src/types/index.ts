// --- Auth ---
export interface User {
  id: string
  email: string
  name: string
  image?: string | null
}

// --- Health ---
export interface WeightEntry {
  id: string
  weight: number
  bodyFatPercentage?: number
  muscleMass?: number
  bmi?: number
  recordedAt: string
}

export interface HealthStats {
  current: number
  average: number
  min: number
  max: number
  change: number
}

// --- Goals ---
export type TaskStatus = 'pending' | 'completed'

export interface Week {
  id: string
  label: string
  startDate: string
  endDate: string
  totalTasks: number
  completedTasks: number
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  parentId: number | null
  createdAt: string
}

export interface Task {
  id: number
  weekId: string
  categoryId: number | null
  title: string
  contentMarkdown: string | null
  contentHtml: string | null
  status: TaskStatus
  isRecurring: boolean
  stalenessCount: number
  tags: string[]
  sortOrder: number
  previousVersionId: number | null
  createdAt: string
  updatedAt: string
}

export interface TaskWithCategory extends Task {
  category: Category | null
}

export interface RecurringTask {
  id: number
  categoryId: number | null
  title: string
  contentMarkdown: string | null
  contentHtml: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: number
  taskId: number | null
  backlogItemId: number | null
  contentMarkdown: string
  contentHtml: string
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  id: number
  noteId: number
  filename: string
  blobKey: string
  mimeType: string
  size: number
  createdAt: string
}

export interface BacklogItem {
  id: number
  categoryId: number | null
  title: string
  contentMarkdown: string | null
  contentHtml: string | null
  tags: string[]
  priority: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  name: string
  categoryId: number
  createdAt: string
}

export interface FollowUp {
  id: number
  sourceTaskId: number
  categoryId: number | null
  title: string
  contentMarkdown: string | null
  contentHtml: string | null
  createdAt: string
  category?: Category | null
}

// --- Wizard ---
export interface WizardRecurringTask extends RecurringTask {
  selected: boolean
}

export interface WizardIncompleteTask extends TaskWithCategory {
  selected: boolean
}

export interface WizardFollowUp extends FollowUp {
  selected: boolean
}

export interface WizardBacklogItem extends BacklogItem {
  selected: boolean
  category?: Category | null
}

export interface WeekGenerationData {
  recurringTasks: WizardRecurringTask[]
  incompleteTasks: WizardIncompleteTask[]
  followUps: WizardFollowUp[]
  backlogItems: WizardBacklogItem[]
}

export interface GenerateWeekPayload {
  label: string
  startDate: string
  endDate: string
  recurringTaskIds: number[]
  incompleteTaskIds: number[]
  followUpIds: number[]
  backlogItemIds: number[]
}

export type ScoreLevel = 'red' | 'yellow' | 'green' | 'fire'
