import {
  AndroidImportance,
  SchedulableTriggerInputTypes,
  cancelAllScheduledNotificationsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
} from "expo-notifications";
import * as SecureStore from "expo-secure-store";

const KEY = "reminder_time"; // "HH:MM", absent when off
const CHANNEL = "reminders";

export type ReminderTime = { hour: number; minute: number };

export const formatTime = ({ hour, minute }: ReminderTime) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/** "20:30", "2030" or "8:5" → time; anything else → null. */
export function parseTime(s: string): ReminderTime | null {
  const m = s.trim().match(/^(\d{1,2})[:.]?(\d{2})$/) ?? s.trim().match(/^(\d{1,2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export async function getReminder(): Promise<ReminderTime | null> {
  const v = await SecureStore.getItemAsync(KEY);
  return v ? parseTime(v) : null;
}

/**
 * Schedules one daily local notification (replacing any earlier one), or turns it off with null.
 * Returns false if the person declined notification permission.
 */
export async function setReminder(t: ReminderTime | null): Promise<boolean> {
  await cancelAllScheduledNotificationsAsync();
  if (!t) {
    await SecureStore.deleteItemAsync(KEY);
    return true;
  }
  // Android 13+ only shows the permission prompt once a channel exists.
  await setNotificationChannelAsync(CHANNEL, {
    name: "Daily reminder",
    importance: AndroidImportance.DEFAULT,
  });
  const perm = await requestPermissionsAsync();
  if (!perm.granted) {
    await SecureStore.deleteItemAsync(KEY);
    return false;
  }
  await scheduleNotificationAsync({
    content: { title: "Anything left to log?", body: "Snap what you ate so today adds up." },
    trigger: { type: SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute, channelId: CHANNEL },
  });
  await SecureStore.setItemAsync(KEY, formatTime(t));
  return true;
}
