export interface AiEvidence {
    content: string;
    source: 'manual' | 'terminal-selection' | 'diagnostic';
    captured_at: string;
}
export const EVIDENCE_LIMIT = 12000;
export interface AiHistoryTurn {
    id: string;
    server_id: number;
    hostname: string;
    address: string;
    created_at: string;
    provider: string;
    model: string;
    query: string;
    evidence: AiEvidence | null;
    analysis: string;
    command: string | null;
}
export function createEvidence(content: string, source: AiEvidence['source'], now = new Date()): AiEvidence {
    if (!content.trim()) throw new Error('Seleccioná o pegá evidencia antes de agregarla.');
    if (content.length > EVIDENCE_LIMIT) throw new Error(`La evidencia supera ${EVIDENCE_LIMIT} caracteres. Seleccioná un fragmento menor.`);
    return { content, source, captured_at: now.toISOString() };
}
