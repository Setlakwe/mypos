declare interface SerialPortInfo {
  path: string;
  manufacturer?: string;
}

declare interface UsbDeviceInfo {
  vendorId: string;
  productId: string;
  manufacturer?: number;
  product?: number;
}

declare interface PrinterConfig {
  type: "serial" | "usb" | "network";
  serial?: {
    port: string;
    baudRate: number;
    dataBits: 5 | 6 | 7 | 8;
    parity: "none" | "even" | "odd";
    stopBits: 1 | 1.5 | 2;
  };
  usb?: {
    vendorId: string;
    productId: string;
  };
  network?: {
    address: string;
    port: number;
  };
}

declare global {
  interface Window {
    api: {
      printerConfig: {
        getCurrentConfig: () => Promise<PrinterConfig>;
        listSerialPorts: () => Promise<SerialPortInfo[]>;
        listUsbDevices: () => Promise<UsbDeviceInfo[]>;
        saveSerialConfig: (config: PrinterConfig["serial"]) => Promise<boolean>;
        saveUsbConfig: (config: PrinterConfig["usb"]) => Promise<boolean>;
        saveNetworkConfig: (config: PrinterConfig["network"]) => Promise<boolean>;
        testConnection: () => Promise<boolean>;
      };
    };
  }
}

export {};
