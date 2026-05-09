import Dexie, { type EntityTable } from 'dexie';

// ─── Type Definitions ───────────────────────────────────────
export interface Project {
  id?: number;
  title: string;
  description: string;
  notes: string;
  tags: string[];
  category: string;
  techStack: string[];
  projectType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  status: 'Planned' | 'Ongoing' | 'Paused' | 'Finished' | 'Archived';
  githubUrl: string;
  deployedUrl: string;
  youtubeUrl: string;
  docsUrl: string;
  links: Array<{ title: string; url: string }>;
  files: Array<{ name: string; url: string; type: string }>;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  createdAt: Date;
}

export interface FinanceEntry {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
  aiCategory?: string;
}

export interface FitnessEntry {
  id?: number;
  date: Date;
  steps: number;
  distance: number; // km
  caloriesBurned: number;
  activeMinutes: number;
  notes: string;
}

export interface DietEntry {
  id?: number;
  date: Date;
  mealType: 'Breakfast' | 'Morning Snack' | 'Lunch' | 'Evening Snack' | 'Dinner' | 'Misc';
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  aiBreakdown: string;
}

export interface GymExercise {
  name: string;
  weight: number;
  sets: number;
  reps: number;
}

export interface GymEntry {
  id?: number;
  date: Date;
  muscleGroup: string;
  exercises: GymExercise[];
  isRestDay: boolean;
  aiSuggestion?: string;
}

export interface HobbyEntry {
  id?: number;
  name: string;
  category: string;
  timeSpent: number; // minutes
  date: Date;
  notes: string;
  milestone?: string;
}

export interface Subject {
  id?: number;
  name: string;
  instructor?: string;
  semester?: string;
  credits?: number;
  priority: 'High' | 'Medium' | 'Low';
  syllabusProgress: number; // 0-100
  notes?: string;
  color: string;
  createdAt: Date;
}

export interface StudyAssignment {
  id?: number;
  subjectId: number;
  title: string;
  type: 'Assignment' | 'Quiz' | 'Lab' | 'Project' | 'Exam' | 'Viva';
  dueDate: Date;
  completed: boolean;
  score?: string;
  notes?: string;
}

export interface StudySession {
  id?: number;
  subject: string;
  subjectId?: number;
  topic: string;
  duration: number; // minutes
  date: Date;
  notes: string;
  quality: 1 | 2 | 3 | 4 | 5;
  focusLevel?: 1 | 2 | 3 | 4 | 5;
  studyMethod?: string;
  breakDuration?: number;
}

export interface HabitEntry {
  id?: number;
  habitName: string;
  completed: boolean;
  date: Date;
  streak: number;
}

export interface AIConversation {
  id?: number;
  messages: ChatMessage[];
  title: string;
  projectId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface WeeklyReport {
  id?: number;
  weekStart: Date;
  weekEnd: Date;
  summary: string;
  productivityScore: number;
  highlights: string[];
  aiInsights: string;
  createdAt: Date;
}

export interface TimelineEvent {
  id?: number;
  title: string;
  description: string;
  category: string;
  date: Date;
  icon?: string;
}

export interface UserSettings {
  id?: number;
  geminiApiKey: string;
  githubToken: string;
  githubUsername: string;
  cloudBackupEnabled: boolean;
  theme: 'dark' | 'light';
  accentColor: string;
  dashboardWidgets: string[];
  name: string;
  avatar: string;
  propFirmAccountsCount: number;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyExpiresAt?: number;
  summerBreakMode?: boolean;
}

export interface Trade {
  id?: number;
  ticker: string;
  marketType: string;
  side: 'Long' | 'Short';
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number;
  riskAmount: number;
  pnl: number;
  pnlPercentage: number;
  entryTime: Date;
  exitTime?: Date;
  status: 'Open' | 'Closed' | 'Cancelled';
  strategy: string;
  setupType: string;
  confidence: number;
  notes: string;
  mistakes: string[];
  emotions: string;
  screenshotUrl?: string;
  tags: string[];
}

// ─── Database ───────────────────────────────────────────────
class LifeOSDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  finance!: EntityTable<FinanceEntry, 'id'>;
  fitness!: EntityTable<FitnessEntry, 'id'>;
  diet!: EntityTable<DietEntry, 'id'>;
  gym!: EntityTable<GymEntry, 'id'>;
  hobbies!: EntityTable<HobbyEntry, 'id'>;
  study!: EntityTable<StudySession, 'id'>;
  subjects!: EntityTable<Subject, 'id'>;
  studyAssignments!: EntityTable<StudyAssignment, 'id'>;
  habits!: EntityTable<HabitEntry, 'id'>;
  conversations!: EntityTable<AIConversation, 'id'>;
  weeklyReports!: EntityTable<WeeklyReport, 'id'>;
  timeline!: EntityTable<TimelineEvent, 'id'>;
  settings!: EntityTable<UserSettings, 'id'>;
  trades!: EntityTable<Trade, 'id'>;

  constructor() {
    super('LifeOSDB');
    this.version(2).stores({
      projects: '++id, title, status, category, createdAt, updatedAt',
      finance: '++id, type, category, date, amount',
      fitness: '++id, date, steps',
      diet: '++id, date, mealType',
      gym: '++id, date, muscleGroup',
      hobbies: '++id, name, category, date',
      study: '++id, subject, date, duration',
      habits: '++id, habitName, date, completed',
      conversations: '++id, title, projectId, createdAt, updatedAt',
      weeklyReports: '++id, weekStart, weekEnd, createdAt',
      timeline: '++id, category, date',
      settings: '++id',
      trades: '++id, ticker, status, entryTime, strategy',
    });
    
    this.version(3).stores({
      projects: '++id, title, status, category, createdAt, updatedAt',
      finance: '++id, type, category, date, amount',
      fitness: '++id, date, steps',
      diet: '++id, date, mealType',
      gym: '++id, date, muscleGroup',
      hobbies: '++id, name, category, date',
      study: '++id, subject, subjectId, date, duration',
      subjects: '++id, name, priority',
      studyAssignments: '++id, subjectId, type, dueDate, completed',
      habits: '++id, habitName, date, completed',
      conversations: '++id, title, projectId, createdAt, updatedAt',
      weeklyReports: '++id, weekStart, weekEnd, createdAt',
      timeline: '++id, category, date',
      settings: '++id',
      trades: '++id, ticker, status, entryTime, strategy',
    });
  }
}

export const db = new LifeOSDB();

// ─── Initializer ───────────────────────────────────────
export async function initializeDb() {
  if (typeof window !== 'undefined' && !localStorage.getItem('wiped_v2')) {
    localStorage.setItem('wiped_v2', 'true');
    await Promise.all([
      db.projects.clear(),
      db.finance.clear(),
      db.fitness.clear(),
      db.diet.clear(),
      db.gym.clear(),
      db.hobbies.clear(),
      db.study.clear(),
      db.habits.clear(),
      db.conversations.clear(),
      db.weeklyReports.clear(),
      db.timeline.clear(),
      db.trades.clear(),
    ]);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      geminiApiKey: '',
      githubToken: '',
      githubUsername: '',
      cloudBackupEnabled: false,
      theme: 'dark',
      accentColor: '#00F5FF',
      dashboardWidgets: ['productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations'],
      name: 'User',
      avatar: '',
      propFirmAccountsCount: 1,
    });
  } else {
    // Migration for existing users
    const s = await db.settings.toArray();
    if (s[0] && (!s[0].dashboardWidgets || !s[0].accentColor || s[0].propFirmAccountsCount === undefined)) {
      await db.settings.update(s[0].id!, {
        dashboardWidgets: s[0].dashboardWidgets || ['productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations'],
        accentColor: s[0].accentColor || '#00F5FF',
        propFirmAccountsCount: s[0].propFirmAccountsCount ?? 1
      });
    }
  }
}
