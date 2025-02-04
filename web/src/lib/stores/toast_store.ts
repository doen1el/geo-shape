import { type Writable, writable } from "svelte/store";

/**
 * Represents a toast notification.
 *
 * @typedef {Object} Toast
 * @property {'info' | 'success' | 'warning' | 'error'} type - The type of the toast notification.
 * @property {string} icon - The icon associated with the toast notification.
 * @property {string} text - The text message displayed in the toast notification.
 */
export type Toast = {
  type: "info" | "success" | "warning" | "error";
  icon: string;
  text: string;
};

/**
 * A writable store that holds a Toast object or null.
 * This store can be used to manage the state of toast notifications in the application.
 *
 * @type {Writable<Toast | null>}
 */
export const toast: Writable<Toast | null> = writable();

/**
 * Displays a toast notification for a specified duration.
 *
 * @param newToast - The toast object to be displayed.
 * @param duration - The duration in milliseconds for which the toast should be displayed. Defaults to 3000ms.
 */
export function show_toast(newToast: Toast, duration: number = 3000) {
  toast.set(newToast);

  setTimeout(() => toast.set(null), duration);
}
