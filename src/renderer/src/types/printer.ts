export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
}

export interface UsbDeviceInfo {
  vendorId: string;
  productId: string;
  manufacturer?: number;
  product?: number;
}

export interface PrinterConfig {
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
