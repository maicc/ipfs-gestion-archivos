<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { filesApi } from '$lib/api.js';

	const cid = $page.params.cid;
	const gatewayUrl = `https://gw.crust-gateway.xyz/ipfs/${cid}`;

	let fileType = $state('loading');
	let fileName = $state('');
	let copied = $state(false);

	onMount(async () => {
		try {
			const res = await filesApi.getPublicFile(cid!);
			fileName = res.data.name ?? '';
			fileType = getFileType(res.data.name ?? '');
		} catch {
			fileType = 'other';
		}
	});

	const getFileType = (name: string) => {
		const ext = name.split('.').pop()?.toLowerCase() ?? '';
		if (['mp4', 'webm', 'mkv', 'mov'].includes(ext)) return 'video';
		if (['mp3', 'ogg', 'wav', 'flac'].includes(ext)) return 'audio';
		if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'jfif'].includes(ext)) return 'image';
		if (ext === 'pdf') return 'pdf';
		return 'other';
	};

	const copyLink = () => {
		navigator.clipboard.writeText(window.location.href);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	};

	const downloadFile = async () => {
		try {
			const res = await fetch(gatewayUrl);
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = fileName ?? cid ?? 'archivo';
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Error descargando:', err);
		}
	};
</script>

<div class="flex min-h-screen flex-col bg-[#f5f0e8]">
	<!-- Header -->
	<header class="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
		<div class="flex items-center gap-2">
			<div class="flex gap-0.5">
				<div class="h-5 w-1.5 rounded-full bg-[#e63946]"></div>
				<div class="h-5 w-1.5 rounded-full bg-[#f4a261]"></div>
				<div class="h-5 w-1.5 rounded-full bg-[#2a9d8f]"></div>
			</div>
			<span class="font-black text-gray-900">OguriFS</span>
		</div>
		<a href="/" class="text-sm text-[#457b9d] hover:underline">Crear cuenta gratis</a>
	</header>

	<!-- Contenido -->
	<main class="flex flex-1 flex-col items-center justify-center px-4 py-12">
		<div class="w-full max-w-3xl">
			<!-- Card -->
			<div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				<!-- Preview -->
				<div class="flex min-h-64 items-center justify-center bg-gray-50 p-4">
					{#if fileType === 'loading'}
						<div class="text-sm text-gray-400">Cargando...</div>
					{:else if fileType === 'image'}
						<img
							src={gatewayUrl}
							alt="archivo"
							class="max-h-96 max-w-full rounded-lg object-contain"
						/>
					{:else if fileType === 'video'}
						<video controls class="max-h-96 w-full max-w-full rounded-lg">
							<source src={gatewayUrl} />
							Tu navegador no soporta video.
						</video>
					{:else if fileType === 'audio'}
						<div class="text-center">
							<div class="mb-4 text-6xl">🎵</div>
							<audio controls class="w-full max-w-sm">
								<source src={gatewayUrl} />
							</audio>
						</div>
					{:else if fileType === 'pdf'}
						<iframe src={gatewayUrl} class="h-96 w-full rounded-lg" title="PDF"></iframe>
					{:else}
						<div class="py-8 text-center">
							<div class="mb-4 text-6xl">📁</div>
							<p class="text-sm text-gray-500">Vista previa no disponible</p>
						</div>
					{/if}
				</div>

				<!-- Info y acciones -->
				<div
					class="flex flex-col items-start justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center"
				>
					<div>
						<p class="max-w-xs truncate font-mono text-xs text-gray-400" title={cid}>
							{cid!.slice(0, 20)}...{cid!.slice(-8)}
						</p>
						<p class="mt-0.5 text-xs text-gray-400">Almacenado en IPFS · descentralizado</p>
					</div>

					<div class="flex gap-2">
						<button
							onclick={copyLink}
							class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
						>
							{copied ? '✓ Copiado' : 'Copiar link'}
						</button>

						<button
							onclick={downloadFile}
							class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800"
						>
							Descargar
						</button>
					</div>
				</div>
			</div>

			<!-- Footer descentralizado -->
			<p class="mt-6 text-center text-xs text-gray-400">
				Este archivo está almacenado de forma descentralizada en IPFS y Crust Network 🌐
			</p>
		</div>
	</main>
</div>
