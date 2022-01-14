import WasmTerminal from "./wasm-terminal";
import WasmTerminalConfig from "./wasm-terminal-config";

import 'xterm/css/xterm.css'
import { StandardIO, WorkerManager } from "./worker-manager";

const consoleCode = `
import code
code.interact()
`

window.onload = () => {
    const config = new WasmTerminalConfig({fetchCommand: null, processWorkerUrl: ''})
    const terminal = new WasmTerminal(config)
    terminal.open(document.getElementById('app-root'))

    const stdio: StandardIO = {
        stdout: (s) => { terminal.print(s) },
        stderr: (s) => { terminal.print(s) },
        stdin: async () => {
            return await terminal.wasmShell.prompt()
        }
    }

    const pythonWorkerManager = new WorkerManager('/python-webworker.js', stdio)
    pythonWorkerManager.runCode(consoleCode)
}
