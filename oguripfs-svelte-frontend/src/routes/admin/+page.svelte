<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores.js';
  import { filesApi } from '$lib/api.js';

  let stats = $state<any>(null);
  let loading = $state(true);

  onMount(async () => {
    await tick();
    if (!$user) { goto('/'); return; }
    await loadStats();
  });

  const loadStats = async () => {
    try {
      const res = await filesApi.getAdminStats();
      stats = res.data;
    } catch (err) {
      console.error(err);
    } finally {
      loading = false;
    }
  };

  const formatBytes = (bytes: string) => {
  const n = parseInt(bytes);
  return `${(n / 1024 / 1024 / 1024).toFixed(3)} GB`;
};
</script>

<div class="min-h-screen bg-[#f5f0e8] p-6">

  <!-- Header -->
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-2">
        <div class="flex gap-0.5">
          <div class="w-1.5 h-5 rounded-full bg-[#e63946]"></div>
          <div class="w-1.5 h-5 rounded-full bg-[#f4a261]"></div>
          <div class="w-1.5 h-5 rounded-full bg-[#2a9d8f]"></div>
        </div>
        <span class="font-black text-gray-900">OguriFS</span>
        <span class="text-gray-400 text-sm ml-2">/ Admin</span>
      </div>
      <a href="/dashboard" class="text-sm text-[#457b9d] hover:underline">← Dashboard</a>
    </div>

    <h1 class="text-2xl font-black text-gray-900 mb-6">Panel de administración</h1>

    {#if loading}
      <div class="text-gray-400 text-sm">Cargando...</div>
    {:else if stats}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Total usuarios -->
        <div class="bg-white border border-gray-200 rounded-2xl p-6">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Usuarios registrados</p>
          <p class="text-4xl font-black text-gray-900">{stats.totalUsers}</p>
          <p class="text-xs text-gray-400 mt-2">Total de cuentas creadas</p>
        </div>

        <!-- Storage usado -->
        <div class="bg-white border border-gray-200 rounded-2xl p-6">
          <p class="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Almacenamiento usado</p>
          <p class="text-4xl font-black text-gray-900">{formatBytes(stats.totalStorageUsedBytes)}</p>
          <p class="text-xs text-gray-400 mt-2">Total entre todos los usuarios</p>
        </div>

      </div>
    {/if}
  </div>
</div>