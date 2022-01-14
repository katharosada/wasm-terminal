import WasmTerminal from "./wasm-terminal";
import WasmTerminalConfig from "./wasm-terminal-config";

import 'xterm/css/xterm.css'
import { StandardIO, WorkerManager } from "./worker-manager";

import "./styles.css"

const consoleCode = `
import code
code.interact()
`

const runButton = document.getElementById('run')
const replButton = document.getElementById('repl')
const clearButton = document.getElementById('clear')

window.onload = () => {
    const config = new WasmTerminalConfig({fetchCommand: null, processWorkerUrl: ''})
    const terminal = new WasmTerminal(config)
    terminal.open(document.getElementById('terminal'))

    const stdio: StandardIO = {
        stdout: (s) => { terminal.print(s) },
        stderr: (s) => { terminal.print(s) },
        stdin: async () => {
            return await terminal.wasmShell.prompt()
        }
    }

    runButton.addEventListener('click', (e) => {
        const code = (document.getElementById('code') as HTMLTextAreaElement).value
        pythonWorkerManager.runCode(code)
    })
    runButton.removeAttribute('disabled')

    replButton.addEventListener('click', (e) => {
        pythonWorkerManager.runCode(consoleCode)
    })
    replButton.removeAttribute('disabled')

    clearButton.addEventListener('click', (e) => {
        terminal.clear()
    })
    clearButton.removeAttribute('disabled')

    const pythonWorkerManager = new WorkerManager('/python-webworker.js', stdio)
}
