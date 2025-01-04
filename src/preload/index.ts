import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

interface SerialConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  parity: string;
  stopBits: number;
}

interface UsbConfig {
  vendorId: string;
  productId: string;
}

interface NetworkConfig {
  address: string;
  port: number;
}

// Custom APIs for renderer
const api = {
  printerConfig: {
    // List available ports
    listSerialPorts: () => ipcRenderer.invoke('printer-list-serial-ports'),
    listUsbDevices: () => ipcRenderer.invoke('printer-list-usb-devices'),
    
    // Save configurations
    saveSerialConfig: (config: SerialConfig) => ipcRenderer.invoke('printer-save-serial-config', config),
    saveUsbConfig: (config: UsbConfig) => ipcRenderer.invoke('printer-save-usb-config', config),
    saveNetworkConfig: (config: NetworkConfig) => ipcRenderer.invoke('printer-save-network-config', config),
    
    // Get current configuration
    getCurrentConfig: () => ipcRenderer.invoke('printer-get-config'),
    
    // Test connection
    testConnection: () => ipcRenderer.invoke('printer-test-connection')
  }
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("serialAPI", {
      writeToPort: (message) => {
        ipcRenderer.send("write-serial", message);
      },
      onFromDevice: (callback) => {
        ipcRenderer.on("from-device", (_event, data) => {
          callback(data);
        });
      },
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
