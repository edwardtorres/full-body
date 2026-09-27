export const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
export type WeekDay = (typeof weekDays)[number]

// Only build-muscle has a program today; the union can grow with supported goals.
export type TrainingGoal = 'build-muscle'

export interface EquipmentProfile {
  dumbbellWeight: number
  unit: 'lb'
  floorSpace: true
}

export interface TrainingSchedule {
  slots: [
    { workoutId: 'full-body-a'; day: WeekDay; time: string },
    { workoutId: 'full-body-b'; day: WeekDay; time: string },
    { workoutId: 'full-body-c'; day: WeekDay; time: string },
  ]
}

export interface UserProfile {
  goal: TrainingGoal
  equipment: EquipmentProfile
  schedule: TrainingSchedule
}

export interface BenchmarkResult {
  exerciseId: string
  weight: number
  reps: number
  targetRir: 2
  completedAt: string
}

export type BenchmarkHistory = Record<string, BenchmarkResult[]>
export type OnboardingStep = 'goal' | 'equipment' | 'schedule' | 'intro' | 'benchmark' | 'summary' | 'complete'

export interface OnboardingState {
  completed: boolean
  step: OnboardingStep
  benchmarkIndex: number
  draftBenchmarks: BenchmarkResult[]
}

export interface PersistedProfile {
  schemaVersion: 1
  profile: UserProfile
  onboarding: OnboardingState
  benchmarks: BenchmarkHistory
}
