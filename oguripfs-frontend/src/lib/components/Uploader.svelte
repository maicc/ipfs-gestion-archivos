<script lang="ts">
  import { filesApi } from '$lib/api.js';

  let { onUploaded }: { onUploaded?: () => void } = $props();

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

  let isDragging = $state(false);
  let uploading = $state(false);
  let progress = $state(0);
  let statusText = $state('');
  let error = $state('');

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) uploadFile(file);
  };

  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    uploading = true;
    error = '';
    progress = 0;

    try {
      // Paso 1: Iniciar
      statusText = 'Preparando subida...';
      const iniciarRes = await filesApi.iniciarSubida(file.name, file.type || 'application/octet-stream', file.size);
      const { uploadId, keyR2 } = iniciarRes.data;

      // Paso 2: Chunks
      const totalParts = Math.ceil(file.size / CHUNK_SIZE);
      const uploadedParts: { PartNumber: number; ETag: string }[] = [];

      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        statusText = `Subiendo parte ${partNumber} de ${totalParts}...`;
        progress = Math.round((partNumber - 1) / totalParts * 80);

        const firmarRes = await filesApi.firmarPartes(keyR2, uploadId, [partNumber]);
        const presignedUrl = firmarRes.data.partes[0].url;

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const uploadRes = await fetch(presignedUrl, {
          method: 'PUT',
          body: chunk,
          headers: { 'Content-Type': file.type || 'application/octet-stream' }
        });

        if (!uploadRes.ok) throw new Error(`Falló la parte ${partNumber}`);

        const etag = uploadRes.headers.get('ETag') ?? '';
        uploadedParts.push({ PartNumber: partNumber, ETag: etag });
      }

      // Paso 3: Completar
      statusText = 'Finalizando...';
      progress = 90;
      await filesApi.completarSubida(keyR2, uploadId, uploadedParts);

      progress = 100;
      statusText = '¡Subida completa! Procesando en la red...';

      setTimeout(() => {
        onUploaded?.();
      }, 1500);

    } catch (err: any) {
      error = err.message ?? 'Error desconocido';
      uploading = false;
    }
  };
</script>

<div class="bg-white border border-gray-200 rounded-2xl p-6">
  <h3 class="text-sm font-semibold text-gray-800 mb-4">Subir archivo</h3>

  {#if !uploading}
    <!-- Zona de drop -->
    <div
      role="button"
      tabindex="0"
      class="border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
        {isDragging ? 'border-[#457b9d] bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
      ondragover={(e) => { e.preventDefault(); isDragging = true; }}
      ondragleave={() => isDragging = false}
      ondrop={handleDrop}
      onclick={() => document.getElementById('fileInput')?.click()}
      onkeydown={(e) => e.key === 'Enter' && document.getElementById('fileInput')?.click()}
    >
      <div class="text-4xl mb-3">☁️</div>
      <p class="text-sm font-medium text-gray-700">Arrastra un archivo aquí</p>
      <p class="text-xs text-gray-400 mt-1">o haz clic para seleccionar</p>
      <p class="text-xs text-gray-300 mt-3">Cualquier tipo de archivo</p>
    </div>

    <input
      id="fileInput"
      type="file"
      class="hidden"
      onchange={handleFileInput}
    />

    {#if error}
      <p class="text-[#e63946] text-sm mt-3">{error}</p>
    {/if}

  {:else}
    <!-- Progreso -->
    <div class="py-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600">{statusText}</span>
        <span class="text-sm font-semibold text-gray-900">{progress}%</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-all duration-300"
          style="width: {progress}%; background: linear-gradient(90deg, #e63946, #457b9d)"
        ></div>
      </div>
      {#if progress === 100}
        <p class="text-[#2a9d8f] text-sm mt-3 text-center font-medium">✓ {statusText}</p>
      {/if}
    </div>
  {/if}
</div>