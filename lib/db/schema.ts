import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash"),
    email: text("email"),
    googleId: text("google_id"),
    themePreference: text("theme_preference", { enum: ["light", "dark", "system"] })
      .notNull()
      .default("system"),
    localePreference: text("locale_preference", { enum: ["es", "en"] }).notNull().default("es"),
    timezone: text("timezone"), // IANA, e.g. "America/Monterrey" — detected in the browser, see timezone-sync.tsx
    installPromptSeen: integer("install_prompt_seen", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("users_username_idx").on(t.username),
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_google_id_idx").on(t.googleId),
  ]
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("categories_user_idx").on(t.userId)]
);

export const habits = sqliteTable(
  "habits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),
    goalType: text("goal_type", { enum: ["binary", "quantitative", "duration"] }).notNull(),
    goalTarget: real("goal_target"),
    goalUnit: text("goal_unit"),
    frequencyType: text("frequency_type", {
      enum: ["daily", "weekdays", "x_per_week", "x_per_month", "custom_interval"],
    }).notNull(),
    frequencyConfig: text("frequency_config"), // JSON
    reminders: text("reminders"), // JSON array of "HH:MM"
    hardMode: integer("hard_mode", { mode: "boolean" }).notNull().default(false),
    skipDaysAllowed: integer("skip_days_allowed").notNull().default(0),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    status: text("status", { enum: ["active", "paused", "archived"] }).notNull().default("active"),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("habits_user_idx").on(t.userId), index("habits_status_idx").on(t.status)]
);

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    habitId: text("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    status: text("status", {
      enum: ["done", "partial", "missed", "justified", "skipped", "frozen"],
    }).notNull(),
    value: real("value"),
    note: text("note"),
    mood: integer("mood"),
    loggedAt: text("logged_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    // ISO 8601, only when status === "done" — null for any other status
    // (partial/missed/justified/skipped/frozen). See logHabit().
    completedAt: text("completed_at"),
  },
  (t) => [
    uniqueIndex("habit_logs_habit_date_idx").on(t.habitId, t.date),
    index("habit_logs_date_idx").on(t.date),
    index("habit_logs_user_idx").on(t.userId),
  ]
);

export const habitStreaks = sqliteTable("habit_streaks", {
  habitId: text("habit_id").primaryKey().references(() => habits.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  freezesAvailable: integer("freezes_available").notNull().default(1),
  freezesUsedThisMonth: integer("freezes_used_this_month").notNull().default(0),
  lastComputedDate: text("last_computed_date"),
});

export const achievements = sqliteTable(
  "achievements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    habitId: text("habit_id").references(() => habits.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["7_days", "30_days", "100_days", "perfect_month", "comeback"],
    }).notNull(),
    unlockedAt: text("unlocked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("achievements_user_idx").on(t.userId)]
);

export const routines = sqliteTable(
  "routines",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    habitIds: text("habit_ids").notNull(), // JSON array
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("routines_user_idx").on(t.userId)]
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

export const focusSessions = sqliteTable(
  "focus_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    habitId: text("habit_id").references(() => habits.id, { onDelete: "set null" }),
    // Independent of habitId: if the session is linked to a habit, the
    // category is derived from that habit (see resolveFocusAttribution in
    // lib/actions/focus.ts); otherwise, the user can choose one directly.
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    mode: text("mode", { enum: ["countdown", "stopwatch"] }).notNull(),
    plannedDurationSeconds: integer("planned_duration_seconds"), // countdown only
    status: text("status", {
      enum: ["running", "on_break", "paused", "completed", "cancelled"],
    })
      .notNull()
      .default("running"),
    startedAt: text("started_at").notNull(),
    lastResumedAt: text("last_resumed_at").notNull(),
    accumulatedActiveSeconds: integer("accumulated_active_seconds").notNull().default(0),
    breaksEnabled: integer("breaks_enabled", { mode: "boolean" }).notNull().default(false),
    breakIntervalMinutes: integer("break_interval_minutes"),
    breakDurationMinutes: integer("break_duration_minutes"),
    breaksTakenCount: integer("breaks_taken_count").notNull().default(0),
    breakStartedAt: text("break_started_at"),
    pausedAt: text("paused_at"),
    completedAt: text("completed_at"),
    autoCompleted: integer("auto_completed", { mode: "boolean" }).notNull().default(false),
    date: text("date").notNull(), // YYYY-MM-DD, day it started (per the day cutoff)
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("focus_sessions_user_idx").on(t.userId),
    index("focus_sessions_user_status_idx").on(t.userId, t.status),
    index("focus_sessions_date_idx").on(t.date),
    index("focus_sessions_habit_idx").on(t.habitId),
    index("focus_sessions_category_idx").on(t.categoryId),
  ]
);

export const focusSettings = sqliteTable("focus_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  dailyGoalMinutes: integer("daily_goal_minutes").notNull().default(60),
  defaultMode: text("default_mode", { enum: ["countdown", "stopwatch"] }).notNull().default("countdown"),
  defaultDurationMinutes: integer("default_duration_minutes").notNull().default(25),
  breaksEnabled: integer("breaks_enabled", { mode: "boolean" }).notNull().default(false),
  breakIntervalMinutes: integer("break_interval_minutes").notNull().default(25),
  breakDurationMinutes: integer("break_duration_minutes").notNull().default(5),
  soundEnabled: integer("sound_enabled", { mode: "boolean" }).notNull().default(true),
});

export const focusRewardTiers = sqliteTable(
  "focus_reward_tiers",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tier: text("tier").notNull(),
    unlockedAt: text("unlocked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("focus_reward_tiers_user_tier_idx").on(t.userId, t.tier),
    index("focus_reward_tiers_user_idx").on(t.userId),
  ]
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  habits: many(habits),
}));

export const habitsRelations = relations(habits, ({ one, many }) => ({
  category: one(categories, { fields: [habits.categoryId], references: [categories.id] }),
  logs: many(habitLogs),
  streak: one(habitStreaks, { fields: [habits.id], references: [habitStreaks.habitId] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  habits: many(habits),
}));

export const habitLogsRelations = relations(habitLogs, ({ one }) => ({
  habit: one(habits, { fields: [habitLogs.habitId], references: [habits.id] }),
}));
