package models

// RespuestaArchivo es lo que le devolvemos al frontend de Svelte
type RespuestaArchivo struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// RespuestaKubo es lo que nos devuelve el nodo IPFS local
type RespuestaKubo struct {
	Name string `json:"Name"`
	Hash string `json:"Hash"`
	Size string `json:"Size"`
}

// PayloadVideo es lo que le mandamos a tu amigo en TypeScript
type Payload struct {
	UUID            string          `json:"uuid"`
	FileInfo        FileInfo        `json:"fileInfo"`
	StorageContract StorageContract `json:"storageContract"`
}

type FileInfo struct {
	NAME       string `json:"name"`
	MIME_TYPE  string `json:"mimeType"`
	SIZE_BYTES string `json:"sizeBytes"`
	CID        string `json:"cid"`
}

type StorageContract struct {
	CRUSTSTATUS string `json:"crustStatus"`
	PINNEDUNTIL string `json:"pinnedUntil"`
}

type FileBasicInfo struct {
	OriginalName string `json:"originalName"`
	MimeType     string `json:"MimeType"`
}
