import LegacyTerminal from './LegacyTerminal';

interface TerminalComponentProps {
    onCommand?: (command: string) => Promise<string>;
    externalCommand?: string;
    hostname?: string;
    websocketUrl?: string;
    externalOutput?: string;
    serverData?: any;
}

export default function TerminalComponent(props: TerminalComponentProps) {
    // Just use the legacy terminal - it works
    return <LegacyTerminal {...props} />;
}
