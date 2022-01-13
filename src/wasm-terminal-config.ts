// The configuration options passed when creating the Wasm terminal

// A Custom command is a function that takes in a stdin string, and an array of argument strings,
// And returns an stdout string, or undefined.
export type CallbackCommand = (
  args: string[],
  stdin: string
) => Promise<string>;

type FetchCommandFunction = (options: {
  args: Array<string>;
  env: { [key: string]: string };
}) => Promise<Uint8Array | CallbackCommand>;

export default class WasmTerminalConfig {
  fetchCommand: FetchCommandFunction;
  processWorkerUrl: string;

  constructor({
    fetchCommand,
    processWorkerUrl,
  }: {
    fetchCommand: FetchCommandFunction;
    processWorkerUrl: string;
  }) {
    this.fetchCommand = fetchCommand;
    this.processWorkerUrl = processWorkerUrl;
  }
}
