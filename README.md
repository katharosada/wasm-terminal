# Python wasm-terminal

Live version here: https://wasm-terminal.firebaseapp.com/

This is a small demo of running Python in the browser with a focus on implementing stdout/stderr and blocking stdin.

Python compiled to WebAssembly is supplied by [Pyodide](https://pyodide.org/).

This demo runs Pyodide in a Web Worker so it's on a separate thread and uses `SharedArrayBuffer` and `Atomics` in javascript to allow stdin to block Python execution until the UI asynchronously resolves input in the terminal.