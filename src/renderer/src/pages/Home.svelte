<script>
import Button from "$lib/components/ui/button/button.svelte";
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
let ipcHandle = () => {
  console.log("clicked");
};
</script>

<h1 class="text">Point de vente</h1>
<Button on:click={ipcHandle}>Click me</Button>
