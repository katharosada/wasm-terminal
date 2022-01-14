
// The Wasm Terminal
// @ts-ignore
import xterm from "xterm";
import * as xtermDefault from "xterm";
const Terminal = xtermDefault.Terminal || xterm.Terminal;
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";

import { default as WasmTerminalConfig } from "./wasm-terminal-config";
import WasmTty from "./wasm-tty/wasm-tty";
import WasmShell from "./wasm-shell/wasm-shell";

const MOBILE_KEYBOARD_EVENTS = ["click", "tap"];

export default class WasmTerminal {
  xterm: any;
  container: HTMLElement | undefined;
  webLinksAddon: WebLinksAddon;
  fitAddon: FitAddon;

  wasmTerminalConfig: WasmTerminalConfig;
  wasmTty: WasmTty;
  wasmShell: WasmShell;

  pasteEvent: any;
  resizeEvent: any;
  dataEvent: any;

  isOpen: boolean;
  pendingPrintOnOpen: string;

  constructor(config: any) {
    this.wasmTerminalConfig = new WasmTerminalConfig(config);

    // Create our xterm element
    this.xterm = new Terminal(
      { scrollback: 10000, fontSize: 14, theme: { background: '#1a1c1f' }, cols: 100}
    );
    // tslint:disable-next-line
    // this.pasteEvent = this.xterm.on("paste", this.onPaste);
    // tslint:disable-next-line
    this.resizeEvent = this.xterm.onResize(this.handleTermResize);
    this.xterm.onKey((keyEvent: { key: string; domEvent: KeyboardEvent }) => {
      // Fix for iOS Keyboard Jumping on space
      if (keyEvent.key === " ") {
        keyEvent.domEvent.preventDefault();
      }
    });

    // Set up our container
    this.container = undefined;

    // Load our addons
    this.webLinksAddon = new WebLinksAddon();
    this.fitAddon = new FitAddon();
    this.xterm.loadAddon(this.fitAddon);
    this.xterm.loadAddon(this.webLinksAddon);

    this.wasmTerminalConfig = new WasmTerminalConfig(config);

    // Create our Shell and tty
    this.wasmTty = new WasmTty(this.xterm);
    this.wasmShell = new WasmShell(this.wasmTerminalConfig, this.wasmTty, {
      disablePrompt: false,
    });
    // tslint:disable-next-line
    this.dataEvent = this.xterm.onData(this.wasmShell.handleTermData);

    this.isOpen = false;
    this.pendingPrintOnOpen = "";
  }

  open(container: HTMLElement) {
    // Remove any current event listeners
    const focusHandler = this.focus.bind(this);
    if (this.container !== undefined) {
      MOBILE_KEYBOARD_EVENTS.forEach((eventName) => {
        this.container.removeEventListener(eventName, focusHandler);
      });
    }

    this.container = container;

    this.xterm.open(container);
    this.isOpen = true;
    setTimeout(() => {
      // Fix for Mobile Browsers and their virtual keyboards
      if (this.container !== undefined) {
        MOBILE_KEYBOARD_EVENTS.forEach((eventName) => {
          this.container.addEventListener(eventName, focusHandler);
        });
      }

      if (this.pendingPrintOnOpen) {
        this.wasmTty.print(this.pendingPrintOnOpen + "\n");
        this.pendingPrintOnOpen = "";
      }
    });
  }

  fit() {
    this.fitAddon.fit();
  }

  clear() {
    this.xterm.clear();
  }

  focus() {
    this.xterm.focus();
  }

  print(message: string, sync?: boolean) {
    // For some reason, double new lines are not respected. Thus, fixing that here
    message = message.replace(/\n\n/g, "\n \n");

    if (!this.isOpen) {
      if (this.pendingPrintOnOpen) {
        this.pendingPrintOnOpen += message;
      } else {
        this.pendingPrintOnOpen = message;
      }
      return;
    }

    if (this.wasmShell.isPrompting()) {
      // Cancel the current prompt and restart
      this.wasmShell.printAndRestartPrompt(() => {
        this.wasmTty.print(message + "\n", sync);
        return undefined;
      });
      return;
    }

    this.wasmTty.print(message, sync);
  }

  kill() {
    // return this.wasmShell.commandRunner?.kill();
  }

  destroy() {
    this.xterm.dispose();
    delete this.xterm;
  }

  onPaste(data: string) {
    this.wasmTty.print(data);
  }

  /**
   * Handle terminal resize
   *
   * This function clears the prompt using the previous configuration,
   * updates the cached terminal size information and then re-renders the
   * input. This leads (most of the times) into a better formatted input.
   */
  handleTermResize = (data: { rows: number; cols: number }) => {
    const { rows, cols } = data;
    this.wasmTty.clearInput();
    this.wasmTty.setTermSize(cols, rows);
    this.wasmTty.setInput(this.wasmTty.getInput(), true);
  };
}
