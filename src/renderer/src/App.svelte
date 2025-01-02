<script lang="ts">
  import Versions from './components/Versions.svelte'
  import Home from "./pages/Home.svelte";
  import Router from "svelte-spa-router";
  import About from "./pages/About.svelte";

  const routes ={
    '/': Home,
    '/home': Home,
    '/about': About,
  }
</script>


<nav>
<a href="#/about">About</a>
<a href="/">Home</a>
</nav>

<Router {routes}></Router>



<Versions />
