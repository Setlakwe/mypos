import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { SerialPort } from 'serialport'

// Create the serial port instance
let serialPort: SerialPort | null = null

// We’ll maintain a queue of messages to write
const writeQueue: string[] = []

// Flag to indicate if we’re currently writing
let isWriting = false

// ────────────────────────────────────────────────────────────────────────────────
//  Create Browser Window
// ────────────────────────────────────────────────────────────────────────────────
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ────────────────────────────────────────────────────────────────────────────────
//  App When Ready
// ────────────────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Just listing the available serial ports as an example
  const ports = await SerialPort.list()
  console.log('Available ports:', ports)

  serialPort = new SerialPort({
    path: 'COM1', // or /dev/ttyUSB0, /dev/tty.usbserial-xxxx, etc.
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    //rtscts: true,
    autoOpen: false
  })

  // Set Windows App User Model ID
  electronApp.setAppUserModelId('com.electron')

  // Watch for devtools shortcuts
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Simple IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Open the serial port
  serialPort.open((err) => {
    if (err) {
      console.error('Failed to open port:', err.message)
      app.quit()
    } else if (serialPort) {
      console.log('Serial port opened on', serialPort.path)
    }
  })

  // Create the BrowserWindow
  createWindow()

  // On macOS re-create a window if no windows are open
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ────────────────────────────────────────────────────────────────────────────────
//  IPC Listeners
// ────────────────────────────────────────────────────────────────────────────────
ipcMain.on('write-serial', (_event, message: string) => {
  if (serialPort && serialPort.isOpen) {
    // Push the message to our queue
    writeQueue.push(message)
    // Attempt to send if we're not already writing
    processWriteQueue()
  } else {
    console.log('Port is not open')
  }
})

/**
 * Takes messages from the writeQueue one at a time, writes them to the serial port,
 * waits for the 'drain' event (or the write callback) before proceeding to the next.
 */
function processWriteQueue(): void {
  // If we are already writing, do nothing
  if (isWriting) return

  // If no messages in queue, do nothing
  if (writeQueue.length === 0) return

  // We are now writing
  isWriting = true

  // Get the next message in the queue
  const nextMessage = writeQueue.shift()
  if (!nextMessage || !serialPort) {
    isWriting = false
    return
  }

  console.log(`Sending data to device on port ${serialPort.path}:`, nextMessage)

  serialPort.write(nextMessage, (err) => {
    if (!serialPort) {
      console.error(`No serial ports.`)
      return
    }
    if (err) {
      console.error(`Error writing to serial port ${serialPort.path}:`, err.message)
      // Regardless of error, try to continue with next queued data
    }
    // Once the write is done, we drain to ensure the data is flushed out
    serialPort.drain((drainErr) => {
      if (drainErr) {
        console.error('Error draining serial port:', drainErr.message)
      }
      // Mark that we are done writing
      isWriting = false
      // Process the next message in the queue
      processWriteQueue()
    })
  })
}

// ────────────────────────────────────────────────────────────────────────────────
//  Window Close / App Quit Handling
// ────────────────────────────────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('quitting....')
    app.quit()
  }
})

app.on('will-quit', () => {
  if (serialPort && serialPort.isOpen) {
    console.log('closing port')
    serialPort.close((err) => {
      if (err) {
        console.error('Error closing port on app quit:', err)
      } else {
        console.log('Port closed on app quit.')
      }
    })
  }
})
