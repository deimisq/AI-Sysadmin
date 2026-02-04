// Type definitions for guacamole-common-js
declare module 'guacamole-common-js' {
    export class WebSocketTunnel {
        constructor(url: string);
        connect(data: string): void;
        disconnect(): void;
        sendMessage(...elements: any[]): void;
        oninstruction?: (opcode: string, parameters: string[]) => void;
        onerror?: (status: Status) => void;
        onstatechange?: (state: number) => void;
    }

    export class Client {
        constructor(tunnel: WebSocketTunnel);

        connect(data?: string): void;
        disconnect(): void;

        getDisplay(): Display;

        sendMouseState(state: Mouse.State): void;
        sendKeyEvent(pressed: number, keysym: number): void;
        sendSize(width: number, height: number): void;

        onstatechange?: (state: number) => void;
        onerror?: (status: Status) => void;
        onclipboard?: (stream: InputStream, mimetype: string) => void;
        onsync?: (timestamp: number) => void;

        static readonly IDLE: number;
        static readonly CONNECTING: number;
        static readonly WAITING: number;
        static readonly CONNECTED: number;
        static readonly DISCONNECTING: number;
        static readonly DISCONNECTED: number;
    }

    export class Display {
        getElement(): HTMLElement;
        getWidth(): number;
        getHeight(): number;
        getDefaultLayer(): Display.VisibleLayer;
        scale(scale: number): void;
    }

    export namespace Display {
        export class VisibleLayer {
            getElement(): HTMLElement;
            resize(width: number, height: number): void;
        }
    }

    export class Mouse {
        constructor(element: HTMLElement);

        onmousedown?: (state: Mouse.State) => void;
        onmouseup?: (state: Mouse.State) => void;
        onmousemove?: (state: Mouse.State) => void;

        dispose?(): void;
    }

    export namespace Mouse {
        export class State {
            x: number;
            y: number;
            left: boolean;
            middle: boolean;
            right: boolean;
            up: boolean;
            down: boolean;
        }

        export namespace State {
            export class Buttons {
                left: boolean;
                middle: boolean;
                right: boolean;
            }
        }
    }

    export class Keyboard {
        constructor(element: HTMLElement | Document);

        onkeydown?: (keysym: number) => boolean | void;
        onkeyup?: (keysym: number) => void;

        dispose?(): void;
    }

    export class InputStream {
        constructor(client: Client, index: number);

        sendBlob(data: Blob): void;
        sendEnd(): void;
    }

    export class OutputStream {
        onack?: (status: Status) => void;

        sendBlob(data: Blob): void;
        sendEnd(): void;
    }

    export class Status {
        code: number;
        message: string;
        isError(): boolean;
    }

    export class AudioPlayer {
        constructor();
        sync(timestamp: number): void;
    }

    export class VideoPlayer {
        constructor();
        sync(timestamp: number): void;
    }
}
