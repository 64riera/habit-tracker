import type { Key } from "swr";
import { swrKeys } from "@/lib/swr/keys";
import { fetchTodayAction } from "@/lib/actions/today-read";
import {
  fetchCategoriesAction,
  fetchFocusHeaderAction,
  fetchHabitNamesAction,
  fetchHabitsListAction,
} from "@/lib/actions/habits-read";
import { fetchTasksAction } from "@/lib/actions/tasks-read";
import { fetchFinanceCategoriesAction, fetchTransactionsAction } from "@/lib/actions/finance-read";
import { fetchGymSessionsAction } from "@/lib/actions/gym-read";
import { fetchGymExercisesAction } from "@/lib/actions/gym-exercises-read";
import { fetchFocusSupportingAction } from "@/lib/actions/focus-supporting-read";
import { fetchHistoryAction } from "@/lib/actions/history-read";
import { fetchStatsAction } from "@/lib/actions/stats-read";
import { fetchRoutinesAction } from "@/lib/actions/routines-read";
import { fetchFocusHistoryAction } from "@/lib/actions/focus-history-read";
import { fetchFocusStatsAction } from "@/lib/actions/focus-stats-read";

const DEFAULT_HISTORY_RANGE_DAYS = 90;

/**
 * Canonical (no-filter) key + fetcher for every SWR-backed section, used to
 * refresh background/unmounted sections on reconnect (see
 * lib/swr/refresh-visited-sections.ts). Filtered variants (e.g. history with
 * a specific habit/category) are intentionally not listed here — those only
 * ever get cached by actually visiting them, same as today.
 */
export type SectionEntry = { key: (today: string) => Key; fetcher: (today: string) => Promise<unknown> };

export const sectionRegistry: SectionEntry[] = [
  { key: (today) => swrKeys.todayHabits(today), fetcher: (today) => fetchTodayAction(today) },
  { key: (today) => swrKeys.habitsList(today), fetcher: (today) => fetchHabitsListAction(today) },
  { key: (today) => swrKeys.tasksList(today), fetcher: (today) => fetchTasksAction(today) },
  { key: () => swrKeys.financeTransactions(), fetcher: () => fetchTransactionsAction() },
  { key: () => swrKeys.financeCategories(), fetcher: () => fetchFinanceCategoriesAction() },
  { key: () => swrKeys.gymSessions(), fetcher: () => fetchGymSessionsAction() },
  { key: () => swrKeys.gymExercises(), fetcher: () => fetchGymExercisesAction() },
  { key: (today) => swrKeys.focusSupporting(today), fetcher: (today) => fetchFocusSupportingAction(today) },
  {
    key: (today) => swrKeys.history(today, "", "", DEFAULT_HISTORY_RANGE_DAYS),
    fetcher: (today) => fetchHistoryAction(today, "", "", DEFAULT_HISTORY_RANGE_DAYS),
  },
  { key: (today) => swrKeys.stats(today), fetcher: (today) => fetchStatsAction(today) },
  { key: (today) => swrKeys.routines(today), fetcher: (today) => fetchRoutinesAction(today) },
  { key: () => swrKeys.focusHistoryList("", ""), fetcher: () => fetchFocusHistoryAction("", "") },
  { key: (today) => swrKeys.focusStats(today), fetcher: (today) => fetchFocusStatsAction(today) },
  { key: () => swrKeys.categories(), fetcher: () => fetchCategoriesAction() },
  { key: () => swrKeys.habitNames(), fetcher: () => fetchHabitNamesAction() },
  { key: () => swrKeys.focusHeader(), fetcher: () => fetchFocusHeaderAction() },
];
