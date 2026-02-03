declare module 'guacamole-common-js' {
    export class Client {
        static CONNECTING: number;
        static CONNECTED: number;
        static DISCONNECTED: number;

        constructor(tunnel: WebSocketTunnel);
        connect(data: string): void;
        disconnect(): void;
        sendSize(width: number, height: number): void;
        sendKeyEvent(pressed: number, keysym: number): void;
        sendMouseState(mouseState: any): void;
        getDisplay(): Display;

        onstatechange: (state: number) => void;
        onerror: (error: any) => void;
    }

    export class WebSocketTunnel {
        constructor(url: string);
    }

    export class Mouse {
        constructor(element: HTMLElement);
        onmousedown: (state: any) => void;
        onmouseup: (state: any) => void;
        onmousemove: (state: any) => void;
    }

    export class Keyboard {
        constructor(element: HTMLElement | Document);
        onkeydown: (keysym: number) => void;
        onkeyup: (keysym: number) => void;
    }

    export class Display {
        getElement(): HTMLElement;
    }
}
