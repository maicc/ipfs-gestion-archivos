<script lang="ts">
  import { goto } from '$app/navigation';
  import { authApi } from '$lib/api.js';
  import { user, token } from '$lib/stores.js';

  let isLogin = true;
  let email = '';
  let password = '';
  let username = '';
  let error = '';
  let loading = false;

  const handleSubmit = async () => {
    error = '';
    loading = true;
    try {
      if (isLogin) {
        const res = await authApi.login(email, password);
        token.set(res.data.token);
        user.set(res.data.usuario);
      } else {
        await authApi.register(username, email, password);
        const res = await authApi.login(email, password);
        token.set(res.data.token);
        user.set(res.data.usuario);
      }
      goto('/dashboard');
    } catch (err: any) {
      error = err.response?.data?.error ?? 'Error inesperado';
    } finally {
      loading = false;
    }
  };
</script>

<div class="min-h-screen bg-[#f5f0e8] flex items-center justify-center relative overflow-hidden">
  
  <!-- Líneas verticales de colores tipo camisa Japón -->
  <div class="absolute inset-0 pointer-events-none">
    {#each [
      { left: '8%', color: '#e63946', height: '70%', top: '5%' },
      { left: '16%', color: '#f4a261', height: '55%', top: '15%' },
      { left: '24%', color: '#2a9d8f', height: '80%', top: '2%' },
      { left: '32%', color: '#457b9d', height: '60%', top: '10%' },
      { left: '40%', color: '#e9c46a', height: '75%', top: '8%' },
      { left: '52%', color: '#e63946', height: '65%', top: '12%' },
      { left: '62%', color: '#2a9d8f', height: '50%', top: '20%' },
      { left: '70%', color: '#f4a261', height: '78%', top: '3%' },
      { left: '78%', color: '#457b9d', height: '58%', top: '18%' },
      { left: '86%', color: '#e9c46a', height: '72%', top: '6%' },
      { left: '92%', color: '#e63946', height: '45%', top: '25%' },
    ] as line}
      <div
        class="absolute w-[2px] rounded-full opacity-60"
        style="left: {line.left}; top: {line.top}; height: {line.height}; background: {line.color};"
      ></div>
    {/each}
  </div>

  <!-- Card -->
  <div class="relative z-10 bg-white border border-gray-200 shadow-xl rounded-2xl p-8 w-full max-w-md">
    
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="w-2 h-6 rounded-full bg-[#e63946]"></div>
        <div class="w-2 h-6 rounded-full bg-[#f4a261]"></div>
        <div class="w-2 h-6 rounded-full bg-[#2a9d8f]"></div>
        <div class="w-2 h-6 rounded-full bg-[#457b9d]"></div>
        <h1 class="text-2xl font-black text-gray-900 mx-2">OguriFS</h1>
        <div class="w-2 h-6 rounded-full bg-[#e9c46a]"></div>
        <div class="w-2 h-6 rounded-full bg-[#e63946]"></div>
        <div class="w-2 h-6 rounded-full bg-[#2a9d8f]"></div>
      </div>
      <p class="text-gray-400 text-sm">Almacenamiento descentralizado</p>
    </div>

    <!-- Toggle -->
    <div class="flex bg-gray-100 rounded-lg p-1 mb-6">
      <button
        class="flex-1 py-2 rounded-md text-sm font-semibold transition-all {isLogin ? 'bg-gray-900 text-white' : 'text-gray-500'}"
        on:click={() => { isLogin = true; error = ''; }}
      >
        Iniciar sesión
      </button>
      <button
        class="flex-1 py-2 rounded-md text-sm font-semibold transition-all {!isLogin ? 'bg-gray-900 text-white' : 'text-gray-500'}"
        on:click={() => { isLogin = false; error = ''; }}
      >
        Registrarse
      </button>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4">
      {#if !isLogin}
        <div>
          <label class="text-gray-600 text-sm mb-1 block font-medium">Usuario</label>
          <input
            type="text"
            bind:value={username}
            placeholder="tunombre"
            required
            class="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      {/if}

      <div>
        <label class="text-gray-600 text-sm mb-1 block font-medium">Email</label>
        <input
          type="email"
          bind:value={email}
          placeholder="tu@email.com"
          required
          class="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div>
        <label class="text-gray-600 text-sm mb-1 block font-medium">Contraseña</label>
        <input
          type="password"
          bind:value={password}
          placeholder="••••••••"
          required
          class="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {#if error}
        <p class="text-[#e63946] text-sm">{error}</p>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-all text-sm mt-2"
      >
        {loading ? 'Cargando...' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
      </button>
    </form>
  </div>
</div>