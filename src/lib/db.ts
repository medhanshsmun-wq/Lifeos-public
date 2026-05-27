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
  micronutrients?: string; // JSON string
}

export interface StandardMeal {
  id?: number;
  mealType: 'Breakfast' | 'Morning Snack' | 'Lunch' | 'Evening Snack' | 'Dinner' | 'Misc';
  name: string;
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients?: string; // JSON string
  createdAt?: Date;
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
  attachments?: { name: string, type: string, data: string }[];
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
  theme: string;
  accentColor: string;
  dashboardWidgets: string[];
  widgetSizes?: Record<string, 'small' | 'large'>;
  name: string;
  avatar: string;
  propFirmAccountsCount: number;
  propFirmName?: string;
  propFirmSize?: number;
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyExpiresAt?: number;
  summerBreakMode?: boolean;
  appleHealthEnabled?: boolean;
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
  isPaperTrade?: boolean;
  propFirm?: string;
}

export interface Todo {
  id?: number;
  task: string;
  completed: boolean;
  date: Date;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: Date;
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
  todos!: EntityTable<Todo, 'id'>;
  standardMeals!: EntityTable<StandardMeal, 'id'>;

  constructor(dbName = 'LifeOSDB') {
    super(dbName);
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

    this.version(4).stores({
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
      todos: '++id, date, completed, priority',
    });

    this.version(5).stores({
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
      todos: '++id, date, completed, priority',
      standardMeals: '++id, mealType, name',
    });
  }
}

export let db = new LifeOSDB();

/** Switch IndexedDB to an isolated store for the signed-in account. */
export function switchUser(accountId: number | string) {
  const dbName = `LifeOSDB_u${accountId}`;
  db = new LifeOSDB(dbName);
  return db;
}

// ─── Initializer ───────────────────────────────────────
export async function initializeDb(profileName?: string) {
  // Removed dangerous localStorage-based wipe logic that could trigger if browser cleared localStorage but kept IndexedDB

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      geminiApiKey: '',
      githubToken: '',
      githubUsername: '',
      cloudBackupEnabled: false,
      theme: 'midnight',
      accentColor: '#00F5FF',
      dashboardWidgets: ['trading-equity', 'active-projects', 'todos', 'productivity', 'recent-activity', 'integrations', 'spotify'],
      name: profileName || '',
      avatar: '',
      propFirmAccountsCount: 1,
    });
  } else {
    // Migration for existing users
    const s = await db.settings.toArray();
    
    // Ensure we only have one settings object to avoid confusion
    if (s.length > 1) {
      // Keep the one with the most data (heuristic: most fields defined)
      const best = s.reduce((prev, curr) => {
        const score = (o: UserSettings) => Object.values(o).filter(v => v !== '' && v !== null && v !== undefined).length;
        return score(curr) > score(prev) ? curr : prev;
      });
      // Delete others
      for (const settingsObj of s) {
        if (settingsObj.id !== best.id) {
          await db.settings.delete(settingsObj.id!);
        }
      }
    }

    const current = (await db.settings.toArray())[0];
    if (current && (!current.dashboardWidgets || !current.accentColor || current.propFirmAccountsCount === undefined || !current.dashboardWidgets.includes('todos'))) {
      const widgets = current.dashboardWidgets || ['trading-equity', 'active-projects', 'productivity', 'recent-activity', 'integrations', 'spotify'];
      if (!widgets.includes('todos')) widgets.unshift('todos');
      if (!widgets.includes('spotify')) widgets.push('spotify');

      await db.settings.update(current.id!, {
        dashboardWidgets: widgets.filter(w => w !== 'ai-insights'),
        accentColor: current.accentColor || '#00F5FF',
        propFirmAccountsCount: current.propFirmAccountsCount ?? 1
      });
    }
  }
}
