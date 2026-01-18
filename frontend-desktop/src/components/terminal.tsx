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
    // Use proxy (WebSocket) for ALL servers
    // Native SSH has compatibility issues with modern SSH servers
    return <LegacyTerminal {...props} />;
}
