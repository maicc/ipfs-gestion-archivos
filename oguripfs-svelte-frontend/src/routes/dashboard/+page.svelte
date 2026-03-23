<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { filesApi } from '$lib/api.js';
	import { user, logout } from '$lib/stores.js';
	import Uploader from '$lib/components/Uploader.svelte';

	let sidebarOpen = $state(false);
	let files = $state<any[]>([]);
	let loading = $state(true);
	let showUploader = $state(false);
	let search = $state('');

	onMount(async () => {
		await tick();
		if (!$user) {
			goto('/');
			return;
		}
		await loadFiles();
	});

	const loadFiles = async () => {
		loading = true;
		try {
			const res = await filesApi.getFiles();
			files = res.data.files;
		} catch (err) {
			console.error('Error loadFiles:', err);
		} finally {
			loading = false;
		}
	};

	const handleDelete = async (cid: string) => {
		if (!confirm('¿Eliminar este archivo?')) return;
		try {
			await filesApi.deleteFile(cid);
			files = files.filter((f) => f.cid !== cid);
		} catch (err) {
			console.error(err);
		}
	};

	const handleLogout = () => {
		logout();
		goto('/');
	};

	const formatSize = (bytes: string) => {
		const n = parseInt(bytes);
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
		return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
	};

	const getMimeIcon = (mime: string) => {
		if (mime.startsWith('video/')) return '🎬';
		if (mime.startsWith('image/')) return '🖼️';
		if (mime.startsWith('audio/')) return '🎵';
		if (mime.includes('pdf')) return '📄';
		return '📁';
	};

	const statusColor = (status: string) => {
		if (status === 'active') return 'bg-green-100 text-green-700';
		if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
		return 'bg-gray-100 text-gray-500';
	};

	let filteredFiles = $derived(
		files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
	);

	let copied = $state('');
	const copyLink = (cid: string, url: string) => {
		navigator.clipboard.writeText(url);
		copied = cid;
		setTimeout(() => (copied = ''), 2000);
	};
</script>

<div class="flex h-screen overflow-hidden bg-white">
	<!-- Sidebar -->
	<!-- Overlay móvil -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-20 bg-black/30 lg:hidden"
			onclick={() => (sidebarOpen = false)}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && (sidebarOpen = false)}
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-30 flex w-56 flex-shrink-0 flex-col border-r border-gray-100 bg-white px-3 py-4 transition-transform duration-200 lg:static
  {sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
	>
		<!-- Logo -->
		<div class="mb-6 flex items-center gap-2 px-2">
			<div class="flex gap-0.5">
				<div class="h-5 w-1.5 rounded-full bg-[#e63946]"></div>
				<div class="h-5 w-1.5 rounded-full bg-[#f4a261]"></div>
				<div class="h-5 w-1.5 rounded-full bg-[#2a9d8f]"></div>
			</div>
			<span class="font-black text-gray-900">OguriFS</span>
		</div>

		<!-- Botón subir -->
		<button
			onclick={() => {
				showUploader = !showUploader;
				sidebarOpen = false;
			}}
			class="mb-6 flex items-center gap-2 rounded-2xl bg-[#f5f0e8] px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition-all hover:bg-[#ede8df]"
		>
			<span class="text-lg">+</span> Subir archivo
		</button>

		<!-- Nav -->
		<nav class="space-y-1">
			<div
				class="flex cursor-pointer items-center gap-3 rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
			>
				<span>🗂️</span> Mis archivos
			</div>
			<div
				class="flex cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-sm text-gray-600 transition-all hover:bg-gray-100"
			>
				<span>🔗</span> Compartidos
			</div>
			<div
				class="flex cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-sm text-gray-600 transition-all hover:bg-gray-100"
			>
				<span>🗑️</span> Papelera
			</div>
		</nav>

		<!-- Storage usado -->
		<div class="mt-auto px-2">
			<div class="mb-1 text-xs text-gray-400">Almacenamiento</div>
			<div class="mb-1 h-1.5 w-full rounded-full bg-gray-100">
				<div class="h-1.5 rounded-full bg-[#457b9d]" style="width: 5%"></div>
			</div>
			<div class="text-xs text-gray-500">Free · 20 GB</div>
		</div>
	</aside>

	<!-- Main -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Header -->
		<header class="flex items-center gap-4 border-b border-gray-100 bg-white px-4 py-3">
			<!-- Botón menú móvil -->
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="rounded-lg p-2 transition-all hover:bg-gray-100 lg:hidden"
			>
				<div class="mb-1 h-0.5 w-5 bg-gray-600"></div>
				<div class="mb-1 h-0.5 w-5 bg-gray-600"></div>
				<div class="h-0.5 w-5 bg-gray-600"></div>
			</button>

			<!-- resto del header igual -->
			<!-- Búsqueda -->
			<div class="max-w-2xl flex-1">
				<div
					class="flex items-center gap-3 rounded-full bg-gray-100 px-4 py-2.5 transition-all hover:bg-gray-200"
				>
					<span class="text-gray-400">🔍</span>
					<input
						type="text"
						bind:value={search}
						placeholder="Buscar en OguriFS"
						class="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
					/>
				</div>
			</div>

			<!-- Usuario -->
			<div class="ml-auto flex items-center gap-3">
				<!-- Plan badge -->
				<span
					class="hidden items-center gap-1 rounded-full border border-gray-200 bg-gradient-to-r from-[#e63946]/10 to-[#457b9d]/10 px-3 py-1.5 text-xs font-medium text-gray-600 capitalize sm:inline-flex"
				>
					✦ {$user?.plan}
				</span>

				<!-- Avatar con dropdown -->
				<div class="group relative">
					<button
						class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#e63946] to-[#457b9d] text-sm font-bold text-white shadow-sm transition-all hover:shadow-md"
					>
						{$user?.username?.charAt(0).toUpperCase()}
					</button>

					<!-- Dropdown -->
					<div
						class="invisible absolute top-11 right-0 z-50 w-48 rounded-xl border border-gray-200 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100"
					>
						<div class="border-b border-gray-100 px-4 py-2">
							<p class="text-sm font-semibold text-gray-900">{$user?.username}</p>
							<p class="truncate text-xs text-gray-400">{$user?.email}</p>
						</div>
						<button
							onclick={handleLogout}
							class="w-full px-4 py-2 text-left text-sm text-[#e63946] transition-all hover:bg-red-50"
						>
							Cerrar sesión
						</button>
					</div>
				</div>
			</div>
		</header>

		<!-- Contenido -->
		<main class="flex-1 overflow-y-auto px-6 py-6">
			{#if showUploader}
				<div class="mb-6">
					<Uploader
						onUploaded={() => {
							showUploader = false;
							loadFiles();
						}}
					/>
				</div>
			{/if}

			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-semibold text-gray-700">Mis archivos</h2>
				<span class="text-xs text-gray-400"
					>{filteredFiles.length} archivo{filteredFiles.length !== 1 ? 's' : ''}</span
				>
			</div>

			{#if loading}
				<div class="flex h-64 items-center justify-center text-sm text-gray-400">Cargando...</div>
			{:else if filteredFiles.length === 0}
				<div class="flex h-64 flex-col items-center justify-center text-center">
					<span class="mb-4 text-5xl">📂</span>
					<p class="font-medium text-gray-500">
						{search ? 'Sin resultados' : 'No tienes archivos todavía'}
					</p>
					<p class="mt-1 text-sm text-gray-400">
						{search ? 'Intenta con otra búsqueda' : 'Sube tu primer archivo'}
					</p>
				</div>
			{:else}
				<!-- Grid de archivos -->
				<div
					class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				>
					{#each filteredFiles as file}
						<div
							class="group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-3 transition-all hover:border-gray-300 hover:shadow-md"
						>
							<!-- Icono -->
							<div
								class="mb-3 flex h-16 items-center justify-center rounded-lg bg-gray-50 text-4xl"
							>
								{getMimeIcon(file.mimeType)}
							</div>

							<!-- Info -->
							<p class="truncate text-xs font-medium text-gray-800" title={file.name}>
								{file.name}
							</p>
							<p class="mt-0.5 text-xs text-gray-400">{formatSize(file.size)}</p>

							<!-- Status badge -->
							<span
								class="mt-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium {statusColor(
									file.status
								)}"
							>
								{file.status === 'active' ? '✓ activo' : '⏳ procesando'}
							</span>

							<!-- Acciones (hover) -->
							<div
								class="absolute inset-x-0 bottom-0 flex rounded-b-xl border-t border-gray-100 bg-white opacity-0 transition-all group-hover:opacity-100"
							>
								<a
									href={`/share/${file.cid}`}
									class="flex-1 rounded-bl-xl py-2 text-center text-xs text-[#457b9d] transition-all hover:bg-gray-50"
								>
									Ver
								</a>
								<button
									onclick={() => copyLink(file.cid, file.gatewayUrl)}
									class="flex-1 py-2 text-center text-xs text-gray-500 transition-all hover:bg-gray-50"
								>
									{copied === file.cid ? '✓' : 'Copiar'}
								</button>
								<button
									onclick={() => handleDelete(file.cid)}
									class="flex-1 rounded-br-xl py-2 text-center text-xs text-[#e63946] transition-all hover:bg-red-50"
								>
									Borrar
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</main>
	</div>
</div>
