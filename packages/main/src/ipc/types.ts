export type MainLog = {
  info: (...args: unknown[]) => void;
};

export type IpcHandlerContext = {
  e2ePath: (name: string) => string | null;
  log: MainLog;
};
