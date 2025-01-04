<script lang="ts">
import { onMount } from "svelte";
import { Button } from "$lib/components/ui/button";
import { toast } from "svelte-sonner";
import type {
  PrinterConfig,
  SerialPortInfo,
  UsbDeviceInfo,
} from "../types/printer";

let currentConfig: PrinterConfig | null = null;
let availableSerialPorts: SerialPortInfo[] = [];
let availableUsbDevices: UsbDeviceInfo[] = [];
let configType: "serial" | "usb" | "network" = "serial";

// Serial config
let selectedPort = "";
let baudRate = 9600;
let dataBits = 8 as 5 | 6 | 7 | 8;
let parity = "none" as "none" | "even" | "odd";
let stopBits = 1 as 1 | 1.5 | 2;

// Network config
let ipAddress = "";
let port = 9100;

// USB config
let vendorId = "";
let productId = "";

onMount(async () => {
  try {
    currentConfig = await window.api.printerConfig.getCurrentConfig();
    if (currentConfig) {
      configType = currentConfig.type;
      if (configType === "serial" && currentConfig.serial) {
        selectedPort = currentConfig.serial.port;
        baudRate = currentConfig.serial.baudRate;
        dataBits = currentConfig.serial.dataBits;
        parity = currentConfig.serial.parity;
        stopBits = currentConfig.serial.stopBits;
      } else if (configType === "network" && currentConfig.network) {
        ipAddress = currentConfig.network.address;
        port = currentConfig.network.port;
      } else if (configType === "usb" && currentConfig.usb) {
        vendorId = currentConfig.usb.vendorId;
        productId = currentConfig.usb.productId;
      }
    }

    // Load available devices
    availableSerialPorts = await window.api.printerConfig.listSerialPorts();
    availableUsbDevices = await window.api.printerConfig.listUsbDevices();
  } catch (error) {
    console.error("Error loading config:", error);
    toast.error("Failed to load configuration");
  }
});

async function saveConfig() {
  try {
    switch (configType) {
      case "serial":
        await window.api.printerConfig.saveSerialConfig({
          port: selectedPort,
          baudRate,
          dataBits,
          parity,
          stopBits,
        });
        break;
      case "network":
        await window.api.printerConfig.saveNetworkConfig({
          address: ipAddress,
          port,
        });
        break;
      case "usb":
        await window.api.printerConfig.saveUsbConfig({
          vendorId,
          productId,
        });
        break;
    }
    toast.success("Configuration saved successfully");
  } catch (error) {
    console.error("Error saving config:", error);
    toast.error("Failed to save configuration");
  }
}

async function testConnection() {
  try {
    await window.api.printerConfig.testConnection();
    toast.success("Connection test successful");
  } catch (error) {
    console.error("Error testing connection:", error);
    toast.error("Connection test failed");
  }
}
</script>

<div class="container mx-auto p-4">
  <h1 class="mb-6 text-2xl font-bold">Printer Configuration</h1>

  <div class="space-y-6">
    <div class="flex space-x-4">
      <Button
        variant={configType === 'serial' ? 'default' : 'outline'}
        on:click={() => configType = 'serial'}
        disabled={import.meta.env.PLATFORM === 'linux'}
      >
        Serial
      </Button>
      <Button
        variant={configType === 'usb' ? 'default' : 'outline'}
        on:click={() => configType = 'usb'}
      >
        USB
      </Button>
      <Button
        variant={configType === 'network' ? 'default' : 'outline'}
        on:click={() => configType = 'network'}
      >
        Network
      </Button>
    </div>

    {#if configType === 'serial'}
      <div class="space-y-4">
        <div>
          <label for="port" class="mb-1 block text-sm font-medium">Port</label>
          <select
            id="port"
            bind:value={selectedPort}
            class="w-full rounded border p-2"
          >
            {#each availableSerialPorts as port}
              <option value={port.path}
                >{port.path} - {port.manufacturer || 'Unknown'}</option
              >
            {/each}
          </select>
        </div>

        <div>
          <label for="baudRate" class="mb-1 block text-sm font-medium"
            >Baud Rate</label
          >
          <select
            id="baudRate"
            bind:value={baudRate}
            class="w-full rounded border p-2"
          >
            {#each [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as rate}
              <option value={rate}>{rate}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="dataBits" class="mb-1 block text-sm font-medium"
            >Data Bits</label
          >
          <select
            id="dataBits"
            bind:value={dataBits}
            class="w-full rounded border p-2"
          >
            {#each [5, 6, 7, 8] as bits}
              <option value={bits}>{bits}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="parity" class="mb-1 block text-sm font-medium"
            >Parity</label
          >
          <select
            id="parity"
            bind:value={parity}
            class="w-full rounded border p-2"
          >
            {#each ['none', 'even', 'odd'] as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="stopBits" class="mb-1 block text-sm font-medium"
            >Stop Bits</label
          >
          <select
            id="stopBits"
            bind:value={stopBits}
            class="w-full rounded border p-2"
          >
            {#each [1, 1.5, 2] as bits}
              <option value={bits}>{bits}</option>
            {/each}
          </select>
        </div>
      </div>
    {:else if configType === 'network'}
      <div class="space-y-4">
        <div>
          <label for="ipAddress" class="mb-1 block text-sm font-medium"
            >IP Address</label
          >
          <input
            id="ipAddress"
            type="text"
            bind:value={ipAddress}
            placeholder="192.168.1.100"
            class="w-full rounded border p-2"
          />
        </div>

        <div>
          <label for="networkPort" class="mb-1 block text-sm font-medium"
            >Port</label
          >
          <input
            id="networkPort"
            type="number"
            bind:value={port}
            placeholder="9100"
            class="w-full rounded border p-2"
          />
        </div>
      </div>
    {:else if configType === 'usb'}
      <div class="space-y-4">
        <div>
          <label for="usbDevice" class="mb-1 block text-sm font-medium"
            >USB Printer</label
          >
          <select
            id="usbDevice"
            class="w-full rounded border p-2"
            on:change={(e) => {
              const [vid, pid] = e.currentTarget.value.split(':');
              vendorId = vid;
              productId = pid;
            }}
          >
            <option value="">Select a printer</option>
            {#each availableUsbDevices as device}
              <option
                value={`${device.vendorId}:${device.productId}`}
                selected={device.vendorId === vendorId && device.productId === productId}
              >
                {device.manufacturer ? `ID ${device.manufacturer}` : ''}
                VID: {device.vendorId} PID: {device.productId}
              </option>
            {/each}
          </select>
          {#if availableUsbDevices.length === 0}
            <p class="mt-2 text-sm text-gray-500">No USB printers detected</p>
          {/if}
        </div>
      </div>
    {/if}

    <div class="flex space-x-4">
      <Button on:click={saveConfig}>Save Configuration</Button>
      <Button variant="outline" on:click={testConnection}
        >Test Connection</Button
      >
    </div>
  </div>
</div>
