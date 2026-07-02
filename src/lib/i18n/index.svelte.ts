import { browser } from '$app/environment';
import { en, type MessageKey } from './en';
import { de } from './de';

export type Locale = 'en' | 'de';

const dicts: Record<Locale, Partial<Record<MessageKey, string>>> = { en, de };
const STORAGE_KEY = 'geoshape:locale';

function detectLocale(): Locale {
	const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
	for (const l of langs) {
		const lc = l?.toLowerCase() ?? '';
		if (lc.startsWith('de')) return 'de';
		if (lc.startsWith('en')) return 'en';
	}
	return 'en';
}

class I18n {
	locale = $state<Locale>('en');

	constructor() {
		if (!browser) return;
		const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;

		if (saved === 'en' || saved === 'de') this.locale = saved;
		else this.locale = detectLocale();
	}

	set(locale: Locale): void {
		this.locale = locale;
		if (browser) localStorage.setItem(STORAGE_KEY, locale);
	}

	toggle(): void {
		this.set(this.locale === 'en' ? 'de' : 'en');
	}

	t(key: MessageKey, params?: Record<string, string | number>): string {
		const template = dicts[this.locale][key] ?? en[key] ?? key;
		if (!params) return template;
		return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
	}
}

export const i18n = new I18n();

export function t(key: MessageKey, params?: Record<string, string | number>): string {
	return i18n.t(key, params);
}
