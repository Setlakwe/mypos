<script lang="ts">
import Versions from "./components/Versions.svelte";
import { ModeWatcher, toggleMode } from "mode-watcher";

import Home from "./pages/Home.svelte";
import Router from "svelte-spa-router";
import About from "./pages/About.svelte";
import Config from "./pages/Config.svelte";
import { Button } from "$lib/components/ui/button";
import { Toaster } from "$lib/components/ui/sonner";
import { push } from "svelte-spa-router";

const routes = {
  "/": Home,
  "/home": Home,
  "/about": About,
  "/config": Config,
};

const navigate = (path: string) => {
  push(path);
};
</script>

<ModeWatcher />
<Toaster />
<body class="min-h-screen">
  <div class="hidden h-full flex-col border-2 md:flex">
    <div
      class="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16"
    >
      <div class="flex items-center space-x-4">
        <Button on:click={toggleMode} variant="outline" size="icon">☰</Button>
        <h2 class="text-lg font-semibold">OmniPOS</h2>
      </div>

      <div class="flex space-x-2">
        <Button variant="ghost" on:click={() => navigate('/')}>Home</Button>
        <Button variant="ghost" on:click={() => navigate('/about')}
          >About</Button
        >
        <Button variant="ghost" on:click={() => navigate('/config')}
          >Config</Button
        >
      </div>

      <div class="flex space-x-2">
        <Button on:click={toggleMode} variant="outline" size="icon">
          <span class="dark:hidden">🌞</span>
          <span class="hidden dark:inline">🌙</span>
          <span class="sr-only">Toggle theme</span>
        </Button>
      </div>
    </div>
  </div>

  <main class="container mx-auto p-4">
    <Router routes={routes} />
  </main>
  <Versions />
</body>
