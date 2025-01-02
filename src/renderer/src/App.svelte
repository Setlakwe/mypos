<script lang="ts">
import Versions from "./components/Versions.svelte";
import { ModeWatcher, toggleMode } from "mode-watcher";

import Home from "./pages/Home.svelte";
import Router from "svelte-spa-router";
import About from "./pages/About.svelte";
import Config from "./pages/Config.svelte";
import { Button } from "$lib/components/ui/button";
import { toast } from "svelte-sonner";
import { Toaster } from "$lib/components/ui/sonner";

import Sun from "lucide-svelte/icons/sun";
import Moon from "lucide-svelte/icons/moon";

const routes = {
  "/": Home,
  "/home": Home,
  "/about": About,
  "/config": Config,
};

const click = () => {
  toast("Hello world");
};
</script>

<ModeWatcher />
<Toaster />
<body class="min-h-screen">
  <div class="hidden h-full flex-col border-2 md:flex">
    <div
      class="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16"
    >
      <div class="ml-auto flex w-full">
        <Button on:click={toggleMode} variant="outline" size="icon">☰</Button>
      </div>
      <h2 class="text-lg font-semibold">OmniPOS</h2>
      <div class="ml-auto flex w-full space-x-2 sm:justify-end">
        <Button on:click={toggleMode} variant="outline" size="icon">
          <Sun
            class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <Moon
            class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
          <span class="sr-only">Toggle theme</span>
        </Button>
      </div>
    </div>
  </div>

  <Button on:click={click}>Show toast</Button>
  <Router routes={routes}></Router>
  <Versions />
</body>
