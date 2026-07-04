import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  nameEs: text("name_es").notNull(),
  nameEn: text("name_en").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
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
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: text("id").primaryKey(),
    habitId: text("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    status: text("status", {
      enum: ["done", "partial", "missed", "justified", "skipped", "frozen"],
    }).notNull(),
    value: real("value"),
    note: text("note"),
    mood: integer("mood"),
    loggedAt: text("logged_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [uniqueIndex("habit_logs_habit_date_idx").on(t.habitId, t.date)]
);

export const habitStreaks = sqliteTable("habit_streaks", {
  habitId: text("habit_id").primaryKey().references(() => habits.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  freezesAvailable: integer("freezes_available").notNull().default(1),
  freezesUsedThisMonth: integer("freezes_used_this_month").notNull().default(0),
  lastComputedDate: text("last_computed_date"),
});

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").references(() => habits.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["7_days", "30_days", "100_days", "perfect_month", "comeback"],
  }).notNull(),
  unlockedAt: text("unlocked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const routines = sqliteTable("routines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  habitIds: text("habit_ids").notNull(), // JSON array
  sortOrder: integer("sort_order").notNull().default(0),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

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
