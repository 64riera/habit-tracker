import type { Key } from "swr";
import { swrKeys } from "@/lib/swr/keys";
import type { RealtimeDomain } from "@/lib/realtime/domain";
import { fetchTodayAction } from "@/lib/actions/today-read";
import {
  fetchCategoriesAction,
  fetchFocusHeaderAction,
  fetchHabitNamesAction,
  fetchHabitsListAction,
} from "@/lib/actions/habits-read";
import { fetchTasksAction } from "@/lib/actions/tasks-read";
import { fetchFinanceCategoriesAction, fetchTransactionsAction } from "@/lib/actions/finance-read";
import { fetchGymSessionsAction, fetchGymSessionDraftAction } from "@/lib/actions/gym-read";
import { fetchGymExercisesAction } from "@/lib/actions/gym-exercises-read";
import { fetchFocusSupportingAction } from "@/lib/actions/focus-supporting-read";
import { fetchHistoryAction } from "@/lib/actions/history-read";
import { fetchStatsAction } from "@/lib/actions/stats-read";
import { fetchRoutinesAction } from "@/lib/actions/routines-read";
import { fetchFocusHistoryAction } from "@/lib/actions/focus-history-read";
import { fetchFocusStatsAction } from "@/lib/actions/focus-stats-read";
import { fetchFocusForestAction } from "@/lib/actions/focus-forest-read";

const DEFAULT_HISTORY_RANGE_DAYS = 90;

/**
 * Canonical (no-filter) key + fetcher for every SWR-backed section, used to
 * refresh background/unmounted sections on reconnect (see
 * lib/swr/refresh-visited-sections.ts). Filtered variants (e.g. history with
 * a specific habit/category) are intentionally not listed here — those only
 * ever get cached by actually visiting them, same as today.
 *
 * `realtimeDomain`, where set, is what lets a realtime push (see
 * lib/realtime/domain.ts) refresh only the section(s) it actually affects
 * instead of the whole registry — see OfflineProvider's use of
 * `refreshVisitedSections` filtered by domain. Most sections have none: an
 * instant push isn't worth it for data that only ever needed to catch up
 * on reconnect/focus to begin with. The live Focus session itself isn't
 * tagged either — it isn't SWR-backed (see useLiveFocusState), and reacts
 * to "focus" pushes directly and more cheaply, with a single server action
 * call instead of a section refresh.
 */
export type SectionEntry = {
  key: (today: string) => Key;
  fetcher: (today: string) => Promise<unknown>;
  realtimeDomain?: RealtimeDomain;
};

export const sectionRegistry: SectionEntry[] = [
  { key: (today) => swrKeys.todayHabits(today), fetcher: (today) => fetchTodayAction(today), realtimeDomain: "habits" },
  { key: (today) => swrKeys.habitsList(today), fetcher: (today) => fetchHabitsListAction(today), realtimeDomain: "habits" },
  { key: (today) => swrKeys.tasksList(today), fetcher: (today) => fetchTasksAction(today) },
  { key: () => swrKeys.financeTransactions(), fetcher: () => fetchTransactionsAction(), realtimeDomain: "finance" },
  { key: () => swrKeys.financeCategories(), fetcher: () => fetchFinanceCategoriesAction() },
  { key: () => swrKeys.gymSessions(), fetcher: () => fetchGymSessionsAction() },
  { key: () => swrKeys.gymExercises(), fetcher: () => fetchGymExercisesAction() },
  { key: () => swrKeys.gymSessionDraft(), fetcher: () => fetchGymSessionDraftAction() },
  { key: (today) => swrKeys.focusSupporting(today), fetcher: (today) => fetchFocusSupportingAction(today) },
  {
    key: (today) => swrKeys.history(today, "", "", DEFAULT_HISTORY_RANGE_DAYS),
    fetcher: (today) => fetchHistoryAction(today, "", "", DEFAULT_HISTORY_RANGE_DAYS),
  },
  { key: (today) => swrKeys.stats(today), fetcher: (today) => fetchStatsAction(today) },
  { key: (today) => swrKeys.routines(today), fetcher: (today) => fetchRoutinesAction(today) },
  { key: () => swrKeys.focusHistoryList("", ""), fetcher: () => fetchFocusHistoryAction("", "") },
  { key: (today) => swrKeys.focusStats(today), fetcher: (today) => fetchFocusStatsAction(today) },
  { key: (today) => swrKeys.focusForest(today), fetcher: (today) => fetchFocusForestAction(today) },
  { key: () => swrKeys.categories(), fetcher: () => fetchCategoriesAction() },
  { key: () => swrKeys.habitNames(), fetcher: () => fetchHabitNamesAction() },
  { key: () => swrKeys.focusHeader(), fetcher: () => fetchFocusHeaderAction() },
];
