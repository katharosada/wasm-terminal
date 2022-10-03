let pyodide = null
let stdinbuffer = null
let fetchBuffer: Uint8Array = null
let fetchBufferMeta: Int32Array = null

let rerun = false
let readlines = []

const replaceStdioCode = `
import sys
import fakeprint

sys.stdout = fakeprint.stdout
sys.stderr = fakeprint.stdout
sys.stdin = fakeprint.stdin
`

const stdout = {
  write: (s) => {
    postMessage({
      type: 'stdout',
      stdout: s,
    })
  },
  flush: () => {},
}

const stderr = {
  write: (s) => {
    postMessage({
      type: 'stderr',
      stdout: s,
    })
  },
  flush: () => {},
}

const stdin = {
  readline: () => {
    // Send message to activate stdin mode
    postMessage({
      type: 'stdin',
    })
    let text = ''
    Atomics.wait(stdinbuffer, 0, -1)
    const numberOfElements = stdinbuffer[0]
    stdinbuffer[0] = -1
    const newStdinData = new Uint8Array(numberOfElements)
    for (let i = 0; i < numberOfElements; i++) {
      newStdinData[i] = stdinbuffer[1 + i]
    }
    const responseStdin = new TextDecoder('utf-8').decode(newStdinData)
    text += responseStdin
    return text
  },
}

const run = async (code) => {
  try {
    pyodide.runPython(code)
  } catch (err) {
    postMessage({
      type: 'stderr',
      stderr: err.toString(),
    })
  }
  postMessage({
    type: 'finished',
  })
}

const syncFetch = {
  request: (method: string, url: string, headers: any, body: any) => {
    let objHeaders = {}
    if (pyodide.isPyProxy(headers) && headers.type === 'dict') {
      objHeaders = headers.toJs({dict_converter: Object.fromEntries})
    }

    postMessage({
      type: 'fetch',
      data: {
        method: method,
        url: url,
        headers: objHeaders
      }
    })
    const res = Atomics.wait(fetchBufferMeta, 0, 0)
    const size = Atomics.exchange(fetchBufferMeta, 1, 0);
    const contentSize = Atomics.exchange(fetchBufferMeta, 2, 0);
    const bytes = fetchBuffer.slice(0, size);
    const contentBytes = fetchBuffer.slice(size, size + contentSize);

    Atomics.store(fetchBufferMeta, 1, 0);

    const decoder = new TextDecoder();
    const textJSON = decoder.decode(bytes);
    const result = JSON.parse(textJSON)
    result.body = contentBytes
    return result
  }
}

const initialise = async () => {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js')

    // @ts-ignore
    pyodide = await loadPyodide({
        fullStdLib: false,
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.3/full/',
    })

    // console.log('loading requests wheel')
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");

    pyodide.registerJsModule('sync_fetch', syncFetch)

    await micropip.install("http://localhost:5000/requests-2.28.1-py3-none-any.whl");

    // Unfortunately we need to fake-out stdin/stdout/stderr because Pyodide
    // doesn't give us access to the underlying emscripten FS streams which
    // must be set up on initialisation.
    pyodide.registerJsModule('fakeprint', {
      stdout: stdout,
      stderr: stderr,
      stdin: stdin,
    })
    pyodide.runPython(replaceStdioCode)

    // console.log('done')
    postMessage({
      type: 'ready',
    })
}

initialise()

onmessage = function (e) {
  switch (e.data.type) {
    case 'run':
        stdinbuffer = new Int32Array(e.data.stdinbuffer)
        fetchBuffer = e.data.fetchBuffer
        fetchBufferMeta = e.data.fetchBufferMeta
        const code = e.data.code
        run(code)
        break
  }
}
