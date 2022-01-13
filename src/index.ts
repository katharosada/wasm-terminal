import WasmTerminal from "./wasm-terminal";
import WasmTerminalConfig from "./wasm-terminal-config";

import 'xterm/css/xterm.css'

window.onload = () => {
    const config = new WasmTerminalConfig({fetchCommand: null, processWorkerUrl: ''})
    const terminal = new WasmTerminal(config)
    terminal.open(document.getElementById('app-root'))

    terminal.print('Hello world\n')
    terminal.print('>> \n')
    terminal.wasmShell.prompt()
    // terminal.wasmTty.read('>> ').promise.then(value => {
    //     console.log(value)
    // })
    
}