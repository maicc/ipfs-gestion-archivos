
const CHUNK_SIZE = 1 * 1024 * 1024

const btn_upload = document.getElementById("btn-uploadFiles")
const fileInput = document.getElementById("uploadFiles")

const upload = async (event) => {
    //const uuid = crypto.randomUUID();
    const uuid = generarUUID();
    event.preventDefault()
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor seleccione un archivo")
        return
    }

    //btn_upload.disable = true
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const originalFileName = file.name;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size)

        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('files', chunk, originalFileName);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('originalFileName', originalFileName);
        formData.append('uuid-name', `${uuid}-${originalFileName}`);
        console.log(`${uuid}-${originalFileName}`)
        try {
            const response = await fetch("http://40.233.104.1:8080/upload",
                {
                    method: "POST",
                    body: formData
                });

            if (!response.ok) {
                throw new Error(`El servidor rechazo el chunk ${chunkIndex}`);
            }

            const result = await response.json();

            console.log("feedback recibido", result)
        } catch (err) {
            console.log("Error en la subida", err);
            return
        }
    }
}

function generarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}