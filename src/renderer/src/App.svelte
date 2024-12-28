<script lang="ts">
  import Versions from './components/Versions.svelte'
  import electronLogo from './assets/electron.svg'
  import ReceiptPrinterEncoder from '../../../node_modules/@point-of-sale/receipt-printer-encoder/dist/receipt-printer-encoder.esm'

  let encoder = new ReceiptPrinterEncoder()

  let result = encoder
    .initialize()
    .codepage('auto')
    .line('How many lines do we need to feed before we cut?')
    .line('8 ----------------------------')
    .line('7 ----------------------------')
    .line('6 ----------------------------')
    .line('5 ----------------------------')
    .line('4 ----------------------------')
    .line('3 ----------------------------')
    .line('2 ----------------------------')
    .line('1 ----------------------------')
    .line('0 Last line, cut below! ------')
    .newline()
    .newline()
    .newline()
    .newline()
    .newline()
    .cut()

    .encode()

  const ipcHandle = (): void => window.serialAPI.writeToPort(result)
</script>

<img alt="logo" class="logo" src={electronLogo} />
<div class="creator">Powered by electron-vite</div>
<div class="text">
  Build an Electron app with
  <span class="svelte">Svelte</span>
  and
  <span class="ts">TypeScript</span>
</div>
<p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
<div class="actions">
  <div class="action">
    <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
  </div>
  <div class="action">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-missing-attribute-->
    <a target="_blank" rel="noreferrer" on:click={ipcHandle}>Send IPC!!</a>
  </div>
</div>
<Versions />
