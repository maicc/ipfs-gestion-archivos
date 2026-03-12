// Tamaño del pedazo: 10 MB (Seguro para la RAM de Node)
const CHUNK_SIZE = 1 * 1024 * 1024; 

async function startUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');

    const file = fileInput.files[0];
    if (!file) {
        alert("¡Por favor selecciona un archivo primero!");
        return;
    }

    uploadBtn.disabled = true;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const originalFileName = file.name;

    statusText.innerText = `Iniciando subida... Calculando ${totalChunks} pedazos.`;

    // Enviar cada pedazo SECUENCIALMENTE
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        
        // Magia: Extraer el pedazo sin saturar la RAM
        const chunk = file.slice(start, end);

        // Armar el formulario idéntico a tu comando curl
        const formData = new FormData();
        formData.append('files', chunk, originalFileName); 
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('originalFileName', originalFileName);

        try {
            statusText.innerText = `Subiendo pedazo ${chunkIndex + 1} de ${totalChunks}...`;
            
            const response = await fetch('http://localhost:3000/api/file/uploadMultiple', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`El servidor rechazó el chunk ${chunkIndex}`);
            }

            const result = await response.json();

            // Actualizar la barra de progreso
            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            progressBar.value = progress;

            // Si el backend nos responde que es el último chunk, mostramos el éxito
            if (result.isLastChunk || chunkIndex === totalChunks - 1) {
                statusText.innerHTML = `✅ <b>¡Éxito!</b><br>CID de IPFS: <a href="${result.ipfs?.gatewayUrl}" target="_blank">${result.ipfs?.cid}</a>`;
                console.log("Respuesta completa de Crust/IPFS:", result);
            }

        } catch (error) {
            console.error("Error en la subida:", error);
            statusText.innerText = `❌ Error en el pedazo ${chunkIndex + 1}. Subida cancelada.`;
            uploadBtn.disabled = false;
            return; // Abortar el bucle si un chunk falla
        }
    }

    uploadBtn.disabled = false;
}