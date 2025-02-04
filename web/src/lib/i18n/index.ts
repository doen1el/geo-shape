/**
 * Initializes the i18n (internationalization) settings for the application.
 *
 * - Registers the available locales ('en' and 'de') and their respective JSON files.
 * - Sets the default locale to 'en'.
 * - Configures the initial locale based on the user's browser settings or the default locale if not available.
 *
 * @module i18n
 *
 * @requires $app/environment
 * @requires $lib/pocketbase
 * @requires svelte-i18n
 */
import { browser } from "$app/environment";
import { pb } from "$lib/pocketbase";
import { init, register } from "svelte-i18n";

const defaultLocale = "en";

register("en", () => import("./locales/en.json"));
register("de", () => import("./locales/de.json"));

init({
  fallbackLocale: defaultLocale,
  initialLocale: browser
    ? (pb.authStore.record?.language ?? window.navigator.language)
    : defaultLocale,
});
