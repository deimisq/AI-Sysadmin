import common from '../locales/en.json';
import desktop from '../locales/desktop.en.json';
import controls from '../locales/controls.en.json';
import templates from '../locales/templates.en.json';

export type AppLanguage = 'es' | 'en';
const english: Record<string, string> = { ...common, ...desktop, ...controls, ...templates };

// El host fija este valor antes de cargar los módulos de la interfaz.
// No se traducen datos del usuario, salidas de terminal ni respuestas del modelo.
export function appLanguage(): AppLanguage {
    return typeof window !== 'undefined' && (window as Window & { __AI_AGENT_LANGUAGE__?: string }).__AI_AGENT_LANGUAGE__ === 'en' ? 'en' : 'es';
}

export function uiText(text: string): string {
    return appLanguage() === 'en' ? (english[text] ?? text) : text;
}

export function uiFormat(text: string, ...values: unknown[]): string {
    return uiText(text).replace(/\{(\d+)\}/g, (placeholder, index) => Number(index) < values.length ? String(values[Number(index)]) : placeholder);
}

if (typeof document !== 'undefined') document.documentElement.lang = appLanguage();
