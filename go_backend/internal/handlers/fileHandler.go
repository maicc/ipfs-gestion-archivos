package handlers

import (
	"fmt"
	"io"
	"net/http"

	"strings"

	"ipfs-gestion-archivos/internal/api"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Ahora devolvemos un HandlerFunc para inyectar el cliente
func FileHandler(clienteR2 *s3.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.URL.Path, "/f/")
		if token == "" {
			http.Error(w, "Enlace inválido", http.StatusBadRequest)
			return
		}

		metadata, err := api.ResolveToken(token)
		if err != nil {
			if err.Error() == "NOT_FOUND" {
				http.Error(w, "Este archivo no existe o el enlace ha expirado", http.StatusNotFound)
				return
			}
			http.Error(w, "Error interno del servidor", http.StatusInternalServerError)
			return
		}

		fmt.Printf("CID %s tiene %d réplicas. Sirviendo desde Gateway IPFS...\n", metadata.CID, metadata.ReplicasCount)

		gatewayURL := fmt.Sprintf("http://127.0.0.1:8080/ipfs/%s?filename=%s", metadata.CID, metadata.Name)

		// ✅ Crear request manual para pasar el Range header
		ipfsReq, err := http.NewRequest("GET", gatewayURL, nil)
		if err != nil {
			http.Error(w, "Error creando request", http.StatusInternalServerError)
			return
		}

		// ✅ Pasar el Range header si el browser lo envía (seeking de video)
		if rangeHeader := r.Header.Get("Range"); rangeHeader != "" {
			ipfsReq.Header.Set("Range", rangeHeader)
		}

		client := &http.Client{}
		resp, err := client.Do(ipfsReq)
		if err != nil {
			fmt.Printf("Error conectando al Gateway: %v\n", err)
			http.Error(w, "Error obteniendo el archivo", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// ✅ Headers de respuesta
		if metadata.Name != "" {
			w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, metadata.Name))
		}
		if metadata.MimeType != "" {
			w.Header().Set("Content-Type", metadata.MimeType)
		}
		// ✅ Pasar Content-Range y Accept-Ranges desde IPFS al browser
		if cr := resp.Header.Get("Content-Range"); cr != "" {
			w.Header().Set("Content-Range", cr)
		}
		w.Header().Set("Accept-Ranges", "bytes")
		w.Header().Set("Content-Length", fmt.Sprintf("%d", resp.ContentLength))

		// ✅ Usar el status code real de IPFS (200 o 206)
		w.WriteHeader(resp.StatusCode)

		_, err = io.Copy(w, resp.Body)
		if err != nil {
			fmt.Printf("Error durante streaming: %v\n", err)
		}
	}
}
