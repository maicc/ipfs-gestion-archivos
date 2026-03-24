package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"ipfs-gestion-archivos/internal/models"
)

func ResolveToken(token string) (models.FileMetadata, error) {
	tsBackendURL := os.Getenv("URL_BACKEND")
	internalSecret := os.Getenv("INTERNAL_SECRET")

	url := fmt.Sprintf("%s/api/file/internal/resolve/%s", tsBackendURL, token)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return models.FileMetadata{}, fmt.Errorf("Error creando request: %v", err)
	}

	req.Header.Set("x-internal-secret", internalSecret)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return models.FileMetadata{}, fmt.Errorf("Error contancto al backend TS: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return models.FileMetadata{}, fmt.Errorf("NOT_FOUND")
	}
	if resp.StatusCode != http.StatusOK {
		return models.FileMetadata{}, fmt.Errorf("El backend devolvió error: %d", resp.StatusCode)
	}

	var metadata models.FileMetadata
	if err := json.NewDecoder(resp.Body).Decode(&metadata); err != nil {
		return models.FileMetadata{}, fmt.Errorf("Error decodificando JSON: %v", err)
	}
	return metadata, nil
}
