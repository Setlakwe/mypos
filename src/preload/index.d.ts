import { ElectronAPI } from "@electron-toolkit/preload";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
    serialAPI: {
      writeToPort: (message: string) => void;
      onFromDevice: (callback: (data: string) => void) => void;
    };
  }
}
