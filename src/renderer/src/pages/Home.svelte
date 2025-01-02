<script>
  import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
  let ipcHandle = () => {
    console.log("clicked");
  };
</script>
<h1 class="text">
  Point de vente
</h1>
<div class="actions">
  <div class="action">
    <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
  </div>
  <div class="action">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-missing-attribute-->
    <a on:click={ipcHandle}>Send IPC!!</a>
  </div>
</div>
