import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";
import { SerialPort } from "serialport";
import * as fs from 'fs';
import * as path from 'path';
import * as usb from 'usb';
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'

// Extended interface for USB endpoints that includes transfer method
interface UsbEndpoint extends usb.Endpoint {
  transfer(data: Buffer, callback: (error: Error | null) => void): void;
}

interface PrinterConfig {
  type: 'serial' | 'usb' | 'network';
  serial?: {
    port: string;
    baudRate: number;
    dataBits: 5 | 6 | 7 | 8;
    parity: 'none' | 'even' | 'odd';
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

let currentConfig: PrinterConfig | null = null;
const CONFIG_PATH = path.join(app.getPath('userData'), 'printer-config.json');

// Load configuration
function loadConfig(): PrinterConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return null;
}

// Save configuration
function saveConfig(config: PrinterConfig): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    currentConfig = config;
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

// Create the serial port instance
let serialPort: SerialPort | null = null;

// Setup IPC handlers for printer configuration
ipcMain.handle('printer-list-serial-ports', async () => {
  try {
    return await SerialPort.list();
  } catch (error) {
    console.error('Error listing serial ports:', error);
    throw error;
  }
});

// Default network printer configuration for Windows Samba share
const DEFAULT_NETWORK_CONFIG: PrinterConfig = {
  type: 'network',
  network: {
    address: '\\\\localhost\\receipt',
    port: 9100
  }
};

ipcMain.handle('printer-list-usb-devices', async () => {
  try {
    const devices = usb.getDeviceList();
    const printers = devices
      .filter(device => {
        // Check interface descriptors without opening the device
        try {
          const desc = device.deviceDescriptor;
          // Try to identify printers based on common printer vendor IDs
          const commonPrinterVendors = [
            0x04b8, // Epson
            0x04f9, // Brother
            0x03f0, // HP
            0x04a9, // Canon
            0x047e  // Zebra
          ];
          return commonPrinterVendors.includes(desc.idVendor);
        } catch (err) {
          console.error('Error checking device descriptor:', err);
          return false;
        }
      })
      .map(device => {
        const desc = device.deviceDescriptor;
        return {
          vendorId: desc.idVendor.toString(16).padStart(4, '0'),
          productId: desc.idProduct.toString(16).padStart(4, '0'),
          manufacturer: device.deviceDescriptor.iManufacturer,
          product: device.deviceDescriptor.iProduct
        };
      });

    // If no USB printers found, return network printer as fallback
    if (printers.length === 0) {
      console.log('No USB printers found, suggesting network printer configuration');
      return [{
        vendorId: '0000',
        productId: '0000',
        manufacturer: 0,
        product: 0,
        isNetworkFallback: true,
        description: 'Network Printer (Windows Shared Printer)'
      }];
    }

    return printers;
  } catch (error) {
    console.error('Error listing USB devices:', error);
    // Return network printer as fallback on error
    return [{
      vendorId: '0000',
      productId: '0000',
      manufacturer: 0,
      product: 0,
      isNetworkFallback: true,
      description: 'Network Printer (Windows Shared Printer)'
    }];
  }
});

// Modified to handle network printer fallback
ipcMain.handle('printer-save-usb-config', async (_, config) => {
  if (config.isNetworkFallback) {
    // If this is our network fallback printer, save network configuration instead
    saveConfig(DEFAULT_NETWORK_CONFIG);
    return true;
  }
  
  const printerConfig: PrinterConfig = {
    type: 'usb',
    usb: config
  };
  saveConfig(printerConfig);
  return true;
});

ipcMain.handle('printer-save-serial-config', async (_, config) => {
  const printerConfig: PrinterConfig = {
    type: 'serial',
    serial: config
  };
  saveConfig(printerConfig);
  return true;
});

ipcMain.handle('printer-save-network-config', async (_, config) => {
  const printerConfig: PrinterConfig = {
    type: 'network',
    network: config
  };
  saveConfig(printerConfig);
  return true;
});

ipcMain.handle('printer-get-config', () => {
  if (!currentConfig) {
    currentConfig = loadConfig();
  }
  return currentConfig;
});

// Create test print data using ESC/POS encoder
function createTestPrintData(): Buffer {
  const encoder = new ReceiptPrinterEncoder();
  const now = new Date().toLocaleString();
  
  return encoder
    .initialize()
    .codepage('auto')
    .align('center')
    .bold(true)
    .line('TEST PRINT')
    .bold(false)
    .rule()
    .align('left')
    .line(`Date: ${now}`)
    .line('Connection Type: ' + (currentConfig?.type || 'Unknown'))
    .newline()
    .align('center')
    .line('If you can read this,')
    .line('printer is working correctly!')
    .newline()
    .newline()
    .cut()
    .encode();
}

async function closeSerialPort(): Promise<void> {
  if (serialPort && serialPort.isOpen) {
    return new Promise((resolve, reject) => {
      serialPort?.close((err) => {
        if (err) {
          console.error('Error closing serial port:', err);
          reject(err);
        } else {
          console.log('Serial port closed successfully');
          resolve();
        }
      });
    });
  }
}

ipcMain.handle('printer-test-connection', async () => {
  if (!currentConfig) {
    throw new Error('No printer configuration found');
  }

  try {
    const testData = createTestPrintData();

    switch (currentConfig.type) {
      case 'serial': {
        // Close any existing connection first
        await closeSerialPort();
        
        const serialConfig = currentConfig?.serial;
        if (!serialConfig) {
          throw new Error('Invalid serial configuration');
        }
        
        return new Promise((resolve, reject) => {
          serialPort = new SerialPort({
            path: serialConfig.port,
            baudRate: serialConfig.baudRate,
            dataBits: serialConfig.dataBits,
            parity: serialConfig.parity,
            stopBits: serialConfig.stopBits,
            autoOpen: false
          });

          serialPort.open((err) => {
            if (err) {
              console.error('Error opening serial port:', err);
              reject(err);
            } else {
              console.log('Serial port opened successfully');
              writeToSerialPort(testData);
              resolve(true);
            }
          });
        });
      }
      case 'network': {
        const networkConfig = currentConfig.network;
        if (!networkConfig) {
          throw new Error('Invalid network configuration');
        }

        // For Windows shared printer (Samba), we'll test if the share exists
        if (networkConfig.address.startsWith('\\\\')) {
          try {
            const testPath = networkConfig.address;
            fs.writeFileSync(testPath, testData);
            return true;
          } catch (error) {
            console.error('Error testing network printer:', error);
            throw new Error(`Cannot access printer share: ${networkConfig.address}`);
          }
        }

        // For network printers, implement TCP/IP printing
        const net = require('net');
        return new Promise((resolve, reject) => {
          const client = new net.Socket();
          client.connect(networkConfig.port, networkConfig.address, () => {
            client.write(testData, (err) => {
              if (err) {
                reject(err);
              } else {
                client.end();
                resolve(true);
              }
            });
          });
          
          client.on('error', (err) => {
            reject(err);
          });
        });
      }
      case 'usb': {
        const usbConfig = currentConfig.usb;
        if (!usbConfig) {
          throw new Error('Invalid USB configuration');
        }

        // Find the USB device
        const device = usb.findByIds(
          parseInt(usbConfig.vendorId, 16),
          parseInt(usbConfig.productId, 16)
        );

        if (!device) {
          throw new Error('USB printer not found');
        }

        return new Promise((resolve, reject) => {
          try {
            device.open();
            
            // Check if device has interfaces
            if (!device.interfaces || device.interfaces.length === 0) {
              throw new Error('No USB interfaces found');
            }

            const iface = device.interfaces[0];
            
            // Claim the interface
            if (iface.isKernelDriverActive()) {
              iface.detachKernelDriver();
            }
            iface.claim();

            // Find the out endpoint
            const endpoint = iface.endpoints.find((ep) => {
              return ep.direction === 'out';
            });
            
            if (!endpoint) {
              throw new Error('USB OUT endpoint not found');
            }

            // Send the test data using node-usb's raw transfer method
            (endpoint as UsbEndpoint).transfer(testData, (err: Error | null) => {
              if (err) {
                reject(err);
              } else {
                resolve(true);
              }
              
              // Release interface and close device
              try {
                iface.release(() => {
                  device.close();
                });
              } catch (e) {
                console.error('Error closing USB device:', e);
              }
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    throw error;
  }
});

// We'll maintain a queue of messages to write
const writeQueue: Array<string | Buffer> = [];

// Flag to indicate if we're currently writing
let isWriting = false;

// ────────────────────────────────────────────────────────────────────────────────
//  Create Browser Window
// ────────────────────────────────────────────────────────────────────────────────
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// ────────────────────────────────────────────────────────────────────────────────
//  App When Ready
// ────────────────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Set Windows App User Model ID
  electronApp.setAppUserModelId("com.electron");

  // Watch for devtools shortcuts
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Simple IPC test
  ipcMain.on("ping", () => console.log("pong"));

  // Create the BrowserWindow
  createWindow();

  // On macOS re-create a window if no windows are open
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ────────────────────────────────────────────────────────────────────────────────
//  IPC Listeners
// ────────────────────────────────────────────────────────────────────────────────
ipcMain.on("write-serial", (_event, message: string | Buffer) => {
  writeToSerialPort(message);
});

/**
 * Send encoded data to printer via serial port or network share
 */
function writeToSerialPort(message: string | Buffer) {
  if (currentConfig?.type === 'network' && currentConfig.network?.address.startsWith('\\\\')) {
    try {
      fs.writeFileSync(currentConfig.network.address, message);
      return;
    } catch (error) {
      console.error('Error writing to network printer:', error);
      return;
    }
  }
  if (serialPort && serialPort.isOpen) {
    // Push the message to our queue
    writeQueue.push(message);
    // Attempt to send if we're not already writing
    processWriteQueue();
  } else {
    console.log("Port is not open");
  }
}

/**
 * Takes messages from the writeQueue one at a time, writes them to the serial port,
 * waits for the 'drain' event (or the write callback) before proceeding to the next.
 */
function processWriteQueue(): void {
  // If we are already writing, do nothing
  if (isWriting) return;

  // If no messages in queue, do nothing
  if (writeQueue.length === 0) return;

  // We are now writing
  isWriting = true;

  // Get the next message in the queue
  const nextMessage = writeQueue.shift();
  if (!nextMessage || !serialPort) {
    isWriting = false;
    return;
  }

  console.log(
    `Sending data to device on port ${serialPort.path}:`,
    nextMessage,
  );

  serialPort.write(nextMessage, (err) => {
    if (!serialPort) {
      console.error(`No serial ports.`);
      return;
    }
    if (err) {
      console.error(
        `Error writing to serial port ${serialPort.path}:`,
        err.message,
      );
      // Regardless of error, try to continue with next queued data
    }
    // Once the write is done, we drain to ensure the data is flushed out
    serialPort.drain((drainErr) => {
      if (drainErr) {
        console.error("Error draining serial port:", drainErr.message);
      }
      // Mark that we are done writing
      isWriting = false;
      // Process the next message in the queue
      processWriteQueue();
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────────
//  Window Close / App Quit Handling
// ────────────────────────────────────────────────────────────────────────────────
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("quitting....");
    app.quit();
  }
});

app.on("will-quit", () => {
  if (serialPort && serialPort.isOpen) {
    console.log("closing port");
    serialPort.close((err) => {
      if (err) {
        console.error("Error closing port on app quit:", err);
      } else {
        console.log("Port closed on app quit.");
      }
    });
  }
});
