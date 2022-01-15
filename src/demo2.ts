import WasmTerminal from "./wasm-terminal";
import WasmTerminalConfig from "./wasm-terminal-config";

import 'xterm/css/xterm.css'

import "./styles.css"

const runButton = document.getElementById('run')
const clearButton = document.getElementById('clear')
const config = new WasmTerminalConfig({fetchCommand: null, processWorkerUrl: ''})

window.onload = async () => {
    const terminal = new WasmTerminal(config)
    terminal.open(document.getElementById('terminal'))

    // @ts-ignore
    const pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.18.1/full/',
        stdout: (s: string) => { terminal.print(s + '\n') },
        stderr: (s: string) => { terminal.print(s + '\n') }
    })

    console.log(pyodide)
    runButton.addEventListener('click', (e) => {
        const code = (document.getElementById('code') as HTMLTextAreaElement).value
        pyodide.runPython(code)
    })
    runButton.removeAttribute('disabled')

    clearButton.addEventListener('click', (e) => {
        terminal.clear()
    })
    clearButton.removeAttribute('disabled')
}
