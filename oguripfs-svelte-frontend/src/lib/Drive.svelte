<script>
  import { writable, derived } from 'svelte/store';

  // ── Config ──────────────────────────────────────────
  const API_URL = 'https://tu-go-backend.com';
  const GATEWAY_URL = 'https://tu-gateway.com';

  // ── Estado global ────────────────────────────────────
  let viewMode = 'grid'; // 'grid' | 'list'
  let currentFolder = null; // null = raíz
  let folderPath = []; // breadcrumb
  let searchQuery = '';
  let isDragging = false;
  let showNewFolderModal = false;
  let newFolderName = '';
  let showShareModal = false;
  let shareFile = null;
  let shareLink = '';
  let uploadQueue = writable([]);
  let files = writable([]);
  let folders = writable([]);
  let loading = true;
  let error = '';

  // ── Auth ─────────────────────────────────────────────
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

 // if (!token) window.location.href = '/login';

  // ── Helpers ──────────────────────────────────────────
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
    return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  function getIcon(mime) {
    if (!mime) return '📁';
    if (mime.startsWith('image/')) return '🖼';
    if (mime.startsWith('video/')) return '🎬';
    if (mime.startsWith('audio/')) return '🎵';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('zip') || mime.includes('rar')) return '🗜';
    if (mime.includes('sheet') || mime.includes('excel')) return '📊';
    if (mime.includes('doc') || mime.includes('word')) return '📝';
    return '📎';
  }

  function getStatusColor(status) {
    if (status === 'confirmed') return '#10b981';
    if (status === 'pending') return '#f59e0b';
    return '#ef4444';
  }

  function getStatusLabel(status) {
    if (status === 'confirmed') return 'Asegurado';
    if (status === 'pending') return 'Guardando...';
    return 'Error';
  }

  // ── Cargar archivos ──────────────────────────────────
  async function loadFiles() {
    loading = true;
    error = '';
    try {
      const params = currentFolder ? `?folder=${currentFolder}` : '';
      const res = await fetch(`${API_URL}/files${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar archivos');
      const data = await res.json();
      files.set(data.files || []);
      folders.set(data.folders || []);
    } catch (e) {
      error = e.message;
      // Mock para desarrollo
      files.set([
        { id: '1', name: 'foto_vacaciones.jpg', size: 4200000, mime_type: 'image/jpeg', pin_status: 'confirmed', created_at: '2026-03-10T10:00:00Z', cid: 'bafybei...', short_code: 'xK92mP' },
        { id: '2', name: 'contrato.pdf', size: 890000, mime_type: 'application/pdf', pin_status: 'confirmed', created_at: '2026-03-08T14:00:00Z', cid: 'bafybei...', short_code: 'pL3nQw' },
        { id: '3', name: 'video_demo.mp4', size: 98000000, mime_type: 'video/mp4', pin_status: 'pending', created_at: '2026-03-15T09:00:00Z', cid: 'bafybei...', short_code: 'mR7sXz' },
        { id: '4', name: 'datos.xlsx', size: 230000, mime_type: 'application/vnd.ms-excel', pin_status: 'confirmed', created_at: '2026-03-01T08:00:00Z', cid: 'bafybei...', short_code: 'nB4tYv' },
        { id: '5', name: 'backup.zip', size: 540000000, mime_type: 'application/zip', pin_status: 'confirmed', created_at: '2026-02-20T16:00:00Z', cid: 'bafybei...', short_code: 'kJ6uAc' },
      ]);
      folders.set([
        { id: 'f1', name: 'Documentos', file_count: 12 },
        { id: 'f2', name: 'Fotos 2025', file_count: 48 },
        { id: 'f3', name: 'Proyectos', file_count: 7 },
      ]);
    } finally {
      loading = false;
    }
  }

  loadFiles();

  // ── Filtro por búsqueda ──────────────────────────────
  $: filteredFiles = $files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  $: filteredFolders = $folders.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Upload con chunks ────────────────────────────────
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por chunk

  async function uploadFile(file) {
    const id = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uuid = crypto.randomUUID();

    uploadQueue.update(q => [...q, {
      id, name: file.name, size: file.size,
      progress: 0, status: 'uploading', chunks: totalChunks, uploaded: 0
    }]);

    try {
      // Subir chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const chunk = file.slice(start, start + CHUNK_SIZE);
        const form = new FormData();
        form.append('chunk', chunk);
        form.append('uuid', uuid);
        form.append('index', i);
        form.append('filename', file.name);

        const res = await fetch(`${API_URL}/upload/chunk`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
        if (!res.ok) throw new Error('Error subiendo chunk');

        const progress = Math.round(((i + 1) / totalChunks) * 90);
        uploadQueue.update(q => q.map(u =>
          u.id === id ? { ...u, progress, uploaded: i + 1 } : u
        ));
      }

      // Notificar al backend que terminó
      uploadQueue.update(q => q.map(u =>
        u.id === id ? { ...u, progress: 95, status: 'processing' } : u
      ));

      const res = await fetch(`${API_URL}/upload/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uuid,
          filename: file.name,
          total_chunks: totalChunks,
          mime_type: file.type,
          folder_id: currentFolder,
          size: file.size
        })
      });

      if (!res.ok) throw new Error('Error procesando archivo');
      const data = await res.json();

      uploadQueue.update(q => q.map(u =>
        u.id === id ? { ...u, progress: 100, status: 'done' } : u
      ));

      // Agregar a lista
      files.update(f => [data.file, ...f]);

      // Limpiar de la cola después de 3s
      setTimeout(() => {
        uploadQueue.update(q => q.filter(u => u.id !== id));
      }, 3000);

    } catch (e) {
      uploadQueue.update(q => q.map(u =>
        u.id === id ? { ...u, status: 'error', error: e.message } : u
      ));
    }
  }

  function handleFiles(fileList) {
    Array.from(fileList).forEach(uploadFile);
  }

  // ── Drag & drop ──────────────────────────────────────
  function onDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }

  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) isDragging = false;
  }

  function onDrop(e) {
    e.preventDefault();
    isDragging = false;
    handleFiles(e.dataTransfer.files);
  }

  function onFileInput(e) {
    handleFiles(e.target.files);
    e.target.value = '';
  }

  // ── Carpetas ─────────────────────────────────────────
  async function createFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/folders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newFolderName, parent_id: currentFolder })
      });
      const data = await res.json();
      folders.update(f => [data.folder, ...f]);
    } catch {
      // Mock
      folders.update(f => [{
        id: crypto.randomUUID(), name: newFolderName, file_count: 0
      }, ...f]);
    }
    newFolderName = '';
    showNewFolderModal = false;
  }

  function openFolder(folder) {
    folderPath = [...folderPath, { id: currentFolder, name: currentFolder ? 'Carpeta' : 'Mi Drive' }];
    currentFolder = folder.id;
    loadFiles();
  }

  function navigateTo(index) {
    const target = folderPath[index];
    folderPath = folderPath.slice(0, index);
    currentFolder = target.id;
    loadFiles();
  }

  // ── Descarga ─────────────────────────────────────────
  function downloadFile(file) {
    window.open(`${GATEWAY_URL}/ipfs/${file.cid}?filename=${encodeURIComponent(file.name)}`, '_blank');
  }

  // ── Compartir ─────────────────────────────────────────
  function openShare(file) {
    shareFile = file;
    shareLink = `${window.location.origin}/s/${file.short_code}`;
    showShareModal = true;
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink);
  }

  // ── Logout ───────────────────────────────────────────
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/#/login';

  }

  // ── Storage usado (mock) ─────────────────────────────
  $: totalUsed = $files.reduce((acc, f) => acc + (f.size || 0), 0);
  const storageLimit = 500 * 1024 ** 3; // 500GB plan básico
  $: usedPercent = Math.min((totalUsed / storageLimit) * 100, 100).toFixed(1);
</script>

<!-- ── Modales ────────────────────────────────────────── -->
{#if showNewFolderModal}
  <div class="modal-overlay" on:click={() => showNewFolderModal = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>Nueva carpeta</h3>
      <input
        type="text"
        placeholder="Nombre de la carpeta"
        bind:value={newFolderName}
        on:keydown={e => e.key === 'Enter' && createFolder()}
        autofocus
      />
      <div class="modal-actions">
        <button class="btn-ghost" on:click={() => showNewFolderModal = false}>Cancelar</button>
        <button class="btn-primary" on:click={createFolder}>Crear</button>
      </div>
    </div>
  </div>
{/if}

{#if showShareModal}
  <div class="modal-overlay" on:click={() => showShareModal = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>Compartir archivo</h3>
      <p class="share-filename">{shareFile?.name}</p>
      <div class="share-link-wrap">
        <input type="text" readonly value={shareLink} />
        <button class="btn-copy" on:click={copyLink}>Copiar</button>
      </div>
      <p class="share-note">Cualquier persona con este link puede descargar el archivo.</p>
      <div class="modal-actions">
        <button class="btn-primary" on:click={() => showShareModal = false}>Listo</button>
      </div>
    </div>
  </div>
{/if}

<!-- ── Layout principal ───────────────────────────────── -->
<div class="app">

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="logo">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="3" fill="white" fill-opacity="0.9"/>
          <rect x="18" y="2" width="12" height="12" rx="3" fill="white" fill-opacity="0.5"/>
          <rect x="2" y="18" width="12" height="12" rx="3" fill="white" fill-opacity="0.5"/>
          <rect x="18" y="18" width="12" height="12" rx="3" fill="white" fill-opacity="0.2"/>
        </svg>
      </div>
      <span class="brand-name">Vaultex</span>
    </div>

    <!-- Botón subir -->
    <label class="btn-upload">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Subir archivos
      <input type="file" multiple on:change={onFileInput} hidden />
    </label>

    <nav class="sidebar-nav">
      <a href="#drive" class="nav-item active">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Mi Drive
      </a>
      <a href="#recent" class="nav-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        Recientes
      </a>
      <a href="#shared" class="nav-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Compartidos
      </a>
    </nav>

    <div class="sidebar-storage">
      <div class="storage-label">
        <span>Almacenamiento</span>
        <span class="storage-used">{formatSize(totalUsed)} / 500 GB</span>
      </div>
      <div class="storage-bar">
        <div class="storage-fill" style="width: {usedPercent}%"></div>
      </div>
      <p class="storage-plan">Plan Basic · $3/mes</p>
    </div>

    <div class="sidebar-user">
      <div class="user-avatar">{(user.name || user.email || 'U')[0].toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">{user.name || 'Usuario'}</div>
        <div class="user-email">{user.email || ''}</div>
      </div>
      <button class="btn-logout" on:click={logout} title="Cerrar sesión">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  </aside>

  <!-- Contenido principal -->
  <main
    class="main"
    class:dragging={isDragging}
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
  >
    <!-- Drop overlay -->
    {#if isDragging}
      <div class="drop-overlay">
        <div class="drop-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>Suelta para subir</p>
        </div>
      </div>
    {/if}

    <!-- Header -->
    <header class="main-header">
      <div class="breadcrumb">
        <button class="crumb" on:click={() => { folderPath = []; currentFolder = null; loadFiles(); }}>
          Mi Drive
        </button>
        {#each folderPath as crumb, i}
          <span class="crumb-sep">›</span>
          <button class="crumb" on:click={() => navigateTo(i)}>{crumb.name}</button>
        {/each}
      </div>

      <div class="header-actions">
        <div class="search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="Buscar archivos..." bind:value={searchQuery} />
        </div>

        <button class="btn-new-folder" on:click={() => showNewFolderModal = true}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
          Nueva carpeta
        </button>

        <div class="view-toggle">
          <button class:active={viewMode === 'grid'} on:click={() => viewMode = 'grid'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button class:active={viewMode === 'list'} on:click={() => viewMode = 'list'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Cola de uploads -->
    {#if $uploadQueue.length > 0}
      <div class="upload-queue">
        {#each $uploadQueue as upload}
          <div class="upload-item" class:done={upload.status === 'done'} class:error={upload.status === 'error'}>
            <div class="upload-info">
              <span class="upload-name">{upload.name}</span>
              <span class="upload-size">{formatSize(upload.size)}</span>
            </div>
            <div class="upload-bar-wrap">
              <div class="upload-bar">
                <div
                  class="upload-fill"
                  class:processing={upload.status === 'processing'}
                  style="width: {upload.progress}%"
                ></div>
              </div>
              <span class="upload-pct">
                {#if upload.status === 'done'}✅
                {:else if upload.status === 'error'}❌
                {:else if upload.status === 'processing'}Procesando...
                {:else}{upload.progress}%{/if}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Contenido -->
    {#if loading}
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando archivos...</p>
      </div>
    {:else}
      <div class="content">

        <!-- Carpetas -->
        {#if filteredFolders.length > 0}
          <section class="section">
            <h2 class="section-title">Carpetas</h2>
            <div class="folders-grid">
              {#each filteredFolders as folder}
                <button class="folder-card" on:dblclick={() => openFolder(folder)}>
                  <div class="folder-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div class="folder-info">
                    <span class="folder-name">{folder.name}</span>
                    <span class="folder-count">{folder.file_count} archivos</span>
                  </div>
                </button>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Archivos -->
        {#if filteredFiles.length > 0}
          <section class="section">
            <h2 class="section-title">Archivos</h2>

            {#if viewMode === 'grid'}
              <div class="files-grid">
                {#each filteredFiles as file}
                  <div class="file-card">
                    <div class="file-preview">
                      {#if file.mime_type?.startsWith('image/')}
                        <img
                          src="{GATEWAY_URL}/ipfs/{file.cid}"
                          alt={file.name}
                          loading="lazy"
                          on:error={e => e.target.style.display='none'}
                        />
                      {:else}
                        <span class="file-emoji">{getIcon(file.mime_type)}</span>
                      {/if}
                    </div>
                    <div class="file-card-body">
                      <p class="file-name" title={file.name}>{file.name}</p>
                      <div class="file-meta">
                        <span class="file-size">{formatSize(file.size)}</span>
                        <span class="pin-dot" style="background:{getStatusColor(file.pin_status)}" title={getStatusLabel(file.pin_status)}></span>
                      </div>
                    </div>
                    <div class="file-actions">
                      <button title="Descargar" on:click={() => downloadFile(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      <button title="Compartir" on:click={() => openShare(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>

            {:else}
              <!-- Vista lista -->
              <div class="files-list">
                <div class="list-header">
                  <span>Nombre</span>
                  <span>Tamaño</span>
                  <span>Fecha</span>
                  <span>Estado</span>
                  <span></span>
                </div>
                {#each filteredFiles as file}
                  <div class="list-row">
                    <span class="list-name">
                      <span class="list-icon">{getIcon(file.mime_type)}</span>
                      {file.name}
                    </span>
                    <span class="list-size">{formatSize(file.size)}</span>
                    <span class="list-date">{formatDate(file.created_at)}</span>
                    <span class="list-status" style="color:{getStatusColor(file.pin_status)}">
                      {getStatusLabel(file.pin_status)}
                    </span>
                    <span class="list-actions">
                      <button title="Descargar" on:click={() => downloadFile(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      <button title="Compartir" on:click={() => openShare(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        {#if filteredFiles.length === 0 && filteredFolders.length === 0 && !loading}
          <div class="empty-state">
            <div class="empty-icon">☁️</div>
            <p class="empty-title">
              {searchQuery ? 'Sin resultados' : 'Tu drive está vacío'}
            </p>
            <p class="empty-sub">
              {searchQuery ? 'Intenta con otro nombre' : 'Arrastra archivos aquí o usa el botón de subir'}
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { background: #f0ede8; font-family: 'DM Sans', sans-serif; }

  /* ── App layout ── */
  .app {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: #0d1b3e;
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    gap: 8px;
    overflow-y: auto;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px;
    margin-bottom: 16px;
  }

  .brand-name {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 18px;
    color: white;
    letter-spacing: -0.5px;
  }

  .btn-upload {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 11px 16px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
    margin-bottom: 8px;
  }

  .btn-upload:hover {
    background: #4f46e5;
    transform: translateY(-1px);
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    color: rgba(255,255,255,0.55);
    text-decoration: none;
    font-size: 13px;
    font-weight: 400;
    transition: background 0.15s, color 0.15s;
  }

  .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
  .nav-item.active { background: rgba(99,102,241,0.2); color: white; }

  .sidebar-storage {
    padding: 14px 12px;
    background: rgba(255,255,255,0.05);
    border-radius: 10px;
    margin-top: auto;
  }

  .storage-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    margin-bottom: 8px;
  }

  .storage-used { color: rgba(255,255,255,0.7); font-weight: 500; }

  .storage-bar {
    height: 4px;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .storage-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #10b981);
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  .storage-plan {
    font-size: 11px;
    color: rgba(255,255,255,0.3);
  }

  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px;
    border-top: 1px solid rgba(255,255,255,0.08);
    margin-top: 8px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #10b981);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    color: white;
    flex-shrink: 0;
  }

  .user-info { flex: 1; min-width: 0; }
  .user-name { font-size: 12px; font-weight: 500; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-email { font-size: 11px; color: rgba(255,255,255,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .btn-logout {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(255,255,255,0.35);
    padding: 4px;
    display: flex;
    transition: color 0.2s;
  }
  .btn-logout:hover { color: rgba(255,255,255,0.8); }

  /* ── Main ── */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    transition: background 0.2s;
  }

  .main.dragging { background: rgba(99,102,241,0.04); }

  .drop-overlay {
    position: absolute;
    inset: 0;
    background: rgba(99,102,241,0.08);
    border: 3px dashed #6366f1;
    border-radius: 16px;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 12px;
  }

  .drop-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: #6366f1;
  }

  .drop-inner p {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 20px;
  }

  /* ── Header ── */
  .main-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 28px;
    border-bottom: 1px solid rgba(0,0,0,0.07);
    background: #f0ede8;
    gap: 16px;
    flex-shrink: 0;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .crumb {
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: #0d1b3e;
    padding: 0;
    transition: opacity 0.15s;
  }
  .crumb:hover { opacity: 0.6; }
  .crumb-sep { color: #aaa; font-size: 18px; }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .search-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 8px;
    padding: 7px 12px;
    color: #aaa;
  }

  .search-wrap input {
    border: none;
    outline: none;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #0d0d14;
    width: 180px;
  }

  .search-wrap input::placeholder { color: #bbb; }

  .btn-new-folder {
    display: flex;
    align-items: center;
    gap: 6px;
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 8px;
    padding: 7px 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #444;
    cursor: pointer;
    transition: border-color 0.2s;
    white-space: nowrap;
  }
  .btn-new-folder:hover { border-color: #0d1b3e; color: #0d1b3e; }

  .view-toggle {
    display: flex;
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 8px;
    overflow: hidden;
  }

  .view-toggle button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 7px 10px;
    color: #aaa;
    display: flex;
    align-items: center;
    transition: background 0.15s, color 0.15s;
  }
  .view-toggle button.active { background: #0d1b3e; color: white; }
  .view-toggle button:hover:not(.active) { background: #f5f4f1; color: #444; }

  /* ── Upload queue ── */
  .upload-queue {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 28px;
    background: white;
    border-bottom: 1px solid #e5e3de;
    flex-shrink: 0;
  }

  .upload-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 14px;
    background: #f8f7f4;
    border-radius: 8px;
    border: 1px solid #e5e3de;
    transition: opacity 0.3s;
  }
  .upload-item.done { opacity: 0.6; }
  .upload-item.error { border-color: #fecaca; background: #fff1f1; }

  .upload-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }
  .upload-name { font-weight: 500; color: #333; }
  .upload-size { color: #aaa; }

  .upload-bar-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .upload-bar {
    flex: 1;
    height: 4px;
    background: #e5e3de;
    border-radius: 2px;
    overflow: hidden;
  }

  .upload-fill {
    height: 100%;
    background: #6366f1;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .upload-fill.processing {
    background: linear-gradient(90deg, #6366f1, #10b981, #6366f1);
    background-size: 200%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .upload-pct { font-size: 11px; color: #888; min-width: 36px; text-align: right; }

  /* ── Content ── */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .section-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 13px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 14px;
  }

  /* ── Folders grid ── */
  .folders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }

  .folder-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 10px;
    padding: 12px 14px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
    text-align: left;
  }
  .folder-card:hover {
    border-color: #0d1b3e;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }

  .folder-icon { color: #f59e0b; flex-shrink: 0; }
  .folder-name { display: block; font-size: 13px; font-weight: 500; color: #0d0d14; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .folder-count { font-size: 11px; color: #aaa; }

  /* ── Files grid ── */
  .files-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .file-card {
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 12px;
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.15s;
    position: relative;
  }
  .file-card:hover {
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    transform: translateY(-2px);
  }
  .file-card:hover .file-actions { opacity: 1; }

  .file-preview {
    height: 110px;
    background: #f8f7f4;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .file-preview img { width: 100%; height: 100%; object-fit: cover; }
  .file-emoji { font-size: 36px; }

  .file-card-body { padding: 10px 12px 8px; }
  .file-name {
    font-size: 12px;
    font-weight: 500;
    color: #0d0d14;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .file-meta { display: flex; align-items: center; justify-content: space-between; }
  .file-size { font-size: 11px; color: #aaa; }
  .pin-dot { width: 7px; height: 7px; border-radius: 50%; }

  .file-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  .file-actions button {
    background: white;
    border: 1px solid #e5e3de;
    border-radius: 6px;
    padding: 5px;
    cursor: pointer;
    color: #555;
    display: flex;
    transition: background 0.15s, color 0.15s;
  }
  .file-actions button:hover { background: #0d1b3e; color: white; border-color: #0d1b3e; }

  /* ── Files list ── */
  .files-list {
    background: white;
    border: 1.5px solid #e5e3de;
    border-radius: 12px;
    overflow: hidden;
  }

  .list-header {
    display: grid;
    grid-template-columns: 1fr 100px 120px 110px 80px;
    padding: 10px 16px;
    font-size: 11px;
    font-weight: 600;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #f0ede8;
    background: #faf9f7;
  }

  .list-row {
    display: grid;
    grid-template-columns: 1fr 100px 120px 110px 80px;
    padding: 12px 16px;
    align-items: center;
    border-bottom: 1px solid #f5f4f1;
    transition: background 0.15s;
  }
  .list-row:last-child { border-bottom: none; }
  .list-row:hover { background: #faf9f7; }

  .list-name { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 400; color: #0d0d14; }
  .list-icon { font-size: 18px; flex-shrink: 0; }
  .list-size { font-size: 12px; color: #888; }
  .list-date { font-size: 12px; color: #888; }
  .list-status { font-size: 12px; font-weight: 500; }
  .list-actions { display: flex; gap: 6px; justify-content: flex-end; }
  .list-actions button {
    background: none;
    border: 1px solid #e5e3de;
    border-radius: 6px;
    padding: 5px;
    cursor: pointer;
    color: #888;
    display: flex;
    transition: background 0.15s, color 0.15s;
  }
  .list-actions button:hover { background: #0d1b3e; color: white; border-color: #0d1b3e; }

  /* ── States ── */
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #aaa;
    font-size: 14px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e3de;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 60px;
  }
  .empty-icon { font-size: 48px; margin-bottom: 8px; }
  .empty-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 18px; color: #333; }
  .empty-sub { font-size: 14px; color: #aaa; text-align: center; font-weight: 300; }

  /* ── Modales ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: white;
    border-radius: 16px;
    padding: 28px;
    width: 380px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  }

  .modal h3 {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 18px;
    color: #0d0d14;
  }

  .modal input[type="text"] {
    border: 1.5px solid #e5e3de;
    border-radius: 8px;
    padding: 11px 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  .modal input:focus { border-color: #6366f1; }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .btn-ghost {
    background: none;
    border: 1.5px solid #e5e3de;
    border-radius: 8px;
    padding: 9px 18px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    color: #666;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .btn-ghost:hover { border-color: #aaa; }

  .btn-primary {
    background: #0d1b3e;
    border: none;
    border-radius: 8px;
    padding: 9px 18px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 13px;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary:hover { background: #162550; }

  .share-filename {
    font-size: 13px;
    color: #888;
    font-weight: 300;
    word-break: break-all;
  }

  .share-link-wrap {
    display: flex;
    gap: 8px;
  }

  .share-link-wrap input {
    flex: 1;
    border: 1.5px solid #e5e3de;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 12px;
    color: #555;
    background: #f8f7f4;
    outline: none;
  }

  .btn-copy {
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 9px 14px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }
  .btn-copy:hover { background: #4f46e5; }

  .share-note {
    font-size: 12px;
    color: #aaa;
    font-weight: 300;
    line-height: 1.5;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sidebar { width: 200px; }
    .list-header, .list-row { grid-template-columns: 1fr 80px 80px; }
    .list-date, .list-status { display: none; }
  }
</style>
