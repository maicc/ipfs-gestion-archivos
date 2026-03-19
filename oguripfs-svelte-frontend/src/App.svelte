<script>
  import Router from 'svelte-spa-router';
  import Login from './lib/Login.svelte';
  import Drive from './lib/Drive.svelte';

  const routes = {
    '/': Login,
    '/login': Login,
    '/drive': Drive,
  };
</script>

<Router {routes} />
```
