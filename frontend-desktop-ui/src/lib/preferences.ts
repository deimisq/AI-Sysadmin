export type PreferencesSection = 'general' | 'ai' | 'backups' | 'context';

export function preferencesSection(value: unknown): PreferencesSection {
    return value === 'ai' || value === 'backups' || value === 'context' ? value : 'general';
}
