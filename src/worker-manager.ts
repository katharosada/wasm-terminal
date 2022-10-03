
export interface StandardIO {
    stdin: () => Promise<string>
    stdout: (s: string) => void
    stderr: (s: string) => void
}

export class WorkerManager {
    private ready: Promise<boolean>
    private workerURL: string
    private worker: Worker
    private standardIO: StandardIO
    private stdinbuffer: SharedArrayBuffer
    private stdinbufferInt: Int32Array
    private fetchBuffer: Uint8Array
    private fetchBufferMeta: Int32Array
    private resolveWorkerReady: (status: boolean) => void

    constructor(workerURL: string, standardIO: StandardIO) {
        this.workerURL = workerURL
        this.worker = null
        this.standardIO = standardIO

        this.initialiseWorker()
    }

    async initialiseWorker() {
        this.ready = new Promise<boolean>((resolve) => {
            this.resolveWorkerReady = resolve
        })
        if (!this.worker) {
            this.worker = new Worker(this.workerURL)
            this.worker.addEventListener('message', this.handleMessageFromWorker)
        }
    }

    async runCode(code: string) {
        await this.ready
        this.stdinbuffer = new SharedArrayBuffer(100 * Int32Array.BYTES_PER_ELEMENT)
        this.stdinbufferInt = new Int32Array(this.stdinbuffer)
        this.stdinbufferInt[0] = -1

        this.fetchBuffer = new Uint8Array(new SharedArrayBuffer(128 * 1024));
        this.fetchBufferMeta = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3),);

        this.worker.postMessage({
            type: 'run',
            stdinbuffer: this.stdinbuffer,
            fetchBuffer: this.fetchBuffer,
            fetchBufferMeta: this.fetchBufferMeta,
            code: code
        })
    }

    handleStdinData(inputValue: string) {
        if (this.stdinbuffer && this.stdinbufferInt) {
            let startingIndex = 1
            if (this.stdinbufferInt[0] > 0) {
                startingIndex = this.stdinbufferInt[0]
            }
            const data = new TextEncoder().encode(inputValue)
            data.forEach((value, index) => {
                this.stdinbufferInt[startingIndex + index] = value
            })
    
            this.stdinbufferInt[0] = startingIndex + data.length - 1
            Atomics.notify(this.stdinbufferInt, 0, 1)
        }
    }

    handleFetch(fetchData: {method: string, url: string, headers: {[key: string]: string}, body: any}) {
        fetch(fetchData.url, {
            method: fetchData.method,
            headers: fetchData.headers
        }).then((response) => {
            const returnStruct = {
                status: response.status,
                reason: response.statusText,
                /* @ts-ignore */
                headers: Object.fromEntries(response.headers.entries()),
            }

            response.arrayBuffer().then((bodyBuffer) => {
                const body = new Uint8Array(bodyBuffer)
                console.log(returnStruct)
                const encoder = new TextEncoder();
                const bytes = encoder.encode(JSON.stringify(returnStruct));
                this.fetchBuffer.set(bytes, 0);
                this.fetchBuffer.set(body, bytes.length)
                Atomics.store(this.fetchBufferMeta, 1, bytes.length);
                Atomics.store(this.fetchBufferMeta, 2, body.length);
                Atomics.store(this.fetchBufferMeta, 0, 1);
                Atomics.notify(this.fetchBufferMeta, 0);
            })
        })
    }

    handleMessageFromWorker = (event: MessageEvent) => {
        const type = event.data.type
        if (type === 'ready') {
            this.resolveWorkerReady(true)
        } else if (type === 'stdout') {
            this.standardIO.stdout(event.data.stdout)
        } else if (type === 'stderr') {
            this.standardIO.stderr(event.data.stderr)
        } else if (type === 'stdin') {
            // Leave it to the terminal to decide whether to chunk it into lines
            // or send characters depending on the use case.
            this.standardIO.stdin().then((inputValue) => {
                console.log('Got some stdin: ', inputValue)
                this.handleStdinData(inputValue)
            })
        } else if (type === 'fetch') {
            const fetchData = event.data.data
            console.log(fetchData)
            this.handleFetch(fetchData)
        }
      }

}