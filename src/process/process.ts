 /**

 This function removes the ansi escape characters
 (normally used for printing colors and so)
 Inspired by: https://github.com/chalk/ansi-regex/blob/master/index.js

MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
const cleanStdout = (stdout: string) => {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  ].join("|");

  const regexPattern = new RegExp(pattern, "g");
  return stdout.replace(regexPattern, "");
};

/**
 * This is a super wild way of getting messages synchronously from outstide the
 * worker. Because the WASI functions are expected to block we need to retrieve
 * data synchronously.
 *
 * We do this by prompting the server that we need data (e.g. by postMessage)
 * then we wait and use `importScripts` to synchronously load the data. On the
 * host/main thread side there is a service worker that intercepts the calls to
 * importScripts.
 *
 * @param id
 * @returns any
 */
function waitForMessage(baseURL: string, id: string): any {
  let startedWaiting = performance.now();
  while (true) {
    const startTime = performance.now();
    let currentTime = performance.now();
    while (currentTime - startTime < 250) {
      currentTime = performance.now();
    }
    (self as any).importScripts(`${baseURL}/runno-message?id=${id}`);
    if ((self as any)[id] !== null) {
      const ret = (self as any)[id];
      delete (self as any)[id];
      return ret;
    }

    // waited for 5 minutes
    if (currentTime - startedWaiting > 5 * 60 * 1000) {
      throw new Error("Timeout waiting");
    }
  }
}

class UserError extends Error {
  user: boolean = true;
}

export type ProcessInit = {
  stdoutCallback: Function;
  stderrCallback: Function;
  endCallback: Function;
  errorCallback: Function;
  sharedStdinBuffer?: SharedArrayBuffer;
  startStdinReadCallback?: Function;
};

export default class Process {
  originalWasmFsJson: any;
  stdoutCallback: Function;
  stderrCallback: Function;
  endCallback: Function;
  errorCallback: Function;
  sharedStdin?: Int32Array;
  startStdinReadCallback?: Function;
  serviceWorkerBaseURL?: string;

  pipedStdin: string;
  stdinPrompt: string = "";

  readStdinCounter: number;

  constructor(
    stdoutCallback: Function,
    stderrCallback: Function,
    endCallback: (exitStatus: number) => void,
    errorCallback: Function,
    startStdinReadCallback?: Function,
    sharedStdinBuffer?: SharedArrayBuffer,
    serviceWorkerBaseURL?: string
  ) {
    this.stdoutCallback = stdoutCallback;
    this.stderrCallback = stderrCallback;
    this.endCallback = endCallback;
    this.errorCallback = errorCallback;

    let sharedStdin: Int32Array | undefined = undefined;
    if (sharedStdinBuffer) {
      sharedStdin = new Int32Array(sharedStdinBuffer);
    }


    // this.wasmFs.volume.fds[0].node.read = this.stdinRead.bind(this);
    // this.wasmFs.volume.fds[1].node.write = this.stdoutWrite.bind(this);
    // this.wasmFs.volume.fds[2].node.write = this.stderrWrite.bind(this);
    // const ttyFd = this.wasmFs.volume.openSync("/dev/tty", "w+");
    // this.wasmFs.volume.fds[ttyFd].node.read = this.stdinRead.bind(this);
    // this.wasmFs.volume.fds[ttyFd].node.write = this.stdoutWrite.bind(this);

    this.sharedStdin = sharedStdin;
    this.startStdinReadCallback = startStdinReadCallback;
    this.serviceWorkerBaseURL = serviceWorkerBaseURL;
    this.readStdinCounter = 0;
    this.pipedStdin = "";
  }

  async start(pipedStdinData?: Uint8Array) {
    const end = (exitStatus: number) => {
      setTimeout(() => {
        this.endCallback(exitStatus);
      }, 50);
    };

    try {
      if (pipedStdinData) {
        this.pipedStdin = new TextDecoder("utf-8").decode(pipedStdinData);
      }
      // await this.command.run(this.wasmFs);
      end(0);
    } catch (e) {
      console.warn(e)
      // if (e instanceof WASIExitError) {
      //   end(e.code || 0);
      //   return;
      // } else if (e instanceof UserError) {
      //   // Don't Error, just end the process
      //   // TODO: Figure out correct semantics
      //   end(0);
      //   return;
      // } else if (e instanceof WASIKillError) {
      //   this.errorCallback(
      //     `Killed with signal: ${(e as any).signal}`,
      //     this.wasmFs.toJSON(),
      //     false
      //   );
      // } else {
      //   this.errorCallback((e as any).toString(), this.wasmFs.toJSON(), false);
      // }
    }
  }

  stdoutWrite(
    stdoutBuffer: Buffer | Uint8Array
    // offset: number = 0,
    // length: number = stdoutBuffer.byteLength,
    // position?: number
  ) {
    if (this.stdoutCallback) {
      this.stdoutCallback(stdoutBuffer);
    }
    let dataLines = new TextDecoder("utf-8").decode(stdoutBuffer).split("\n");
    if (dataLines.length > 0) {
      this.stdinPrompt = cleanStdout(dataLines[dataLines.length - 1]);
    } else {
      this.stdinPrompt = "";
    }
    return stdoutBuffer.length;
  }

  stderrWrite(
    stderrBuffer: Buffer | Uint8Array
    // offset: number = 0,
    // length: number = stderrBuffer.byteLength,
    // position?: number
  ) {
    if (this.stderrCallback) {
      this.stderrCallback(stderrBuffer);
    }
    //let dataLines = new TextDecoder("utf-8").decode(stderrBuffer).split("\n");
    return stderrBuffer.length;
  }

  // Handle read of stdin, similar to C read
  // https://linux.die.net/man/2/read
  // This is the bottom of the "layers stack". This is the outer binding.
  // This is the the thing that returns -1 because it is the actual file system,
  // but it is up to WASI lib  (wasi.ts) to find out why this error'd
  stdinRead(
    stdinBuffer: Buffer | Uint8Array
    // offset: number = 0,
    // length: number = stdinBuffer.byteLength,
    // position?: number
  ) {
    if (this.readStdinCounter % 2 !== 0) {
      this.readStdinCounter++;
      return 0;
    }

    let responseStdin: string | null = null;
    if (this.pipedStdin) {
      responseStdin = this.pipedStdin;
      this.pipedStdin = "";
      this.readStdinCounter++;
    } else if (this.sharedStdin && this.startStdinReadCallback) {
      this.startStdinReadCallback();
      Atomics.wait(this.sharedStdin, 0, -1);

      // Grab the of elements
      const numberOfElements = this.sharedStdin[0];
      this.sharedStdin[0] = -1;
      const newStdinData = new Uint8Array(numberOfElements);
      for (let i = 0; i < numberOfElements; i++) {
        newStdinData[i] = this.sharedStdin[1 + i];
      }
      responseStdin = new TextDecoder("utf-8").decode(newStdinData);
    } else if (this.serviceWorkerBaseURL && this.startStdinReadCallback) {
      this.startStdinReadCallback();
      responseStdin = waitForMessage(this.serviceWorkerBaseURL, "stdin");
    } else {
      responseStdin = prompt(this.stdinPrompt);
      if (responseStdin === null) {
        if (this.stdoutCallback) {
          this.stdoutCallback(new TextEncoder().encode("\n"));
        }
        const userError = new UserError("Process killed by user");
        throw userError;
      }
      responseStdin += "\n";
      if (this.stdoutCallback) {
        this.stdoutCallback(new TextEncoder().encode(responseStdin));
      }
    }

    // First check for errors
    if (!responseStdin) {
      return 0;
    }

    const buffer = new TextEncoder().encode(responseStdin);
    for (let x = 0; x < buffer.length; ++x) {
      stdinBuffer[x] = buffer[x];
    }

    // Return the current stdin
    return buffer.length;
  }
}
