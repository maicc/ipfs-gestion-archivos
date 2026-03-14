package ipfs

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"

	"ipfs-gestion-archivos/internal/models" // Cambia "oguripfs-backend" si tu go.mod se llama diferente
)

// SubirArchivo streamea un archivo físico directamente a tu nodo Kubo local
func SubirArchivo(rutaArchivo string) (models.RespuestaKubo, error) {
	urlbase := os.Getenv("IPFS_URL")
	if urlbase == "" {
		urlbase = "http://127.0.0.1:5001"
	}

	urlKubo := urlbase + "/api/v0/add?pin=true&cid-version=1"

	pr, pw := io.Pipe()
	writer := multipart.NewWriter(pw)

	go func() {
		defer pw.Close()
		defer writer.Close()

		archivo, err := os.Open(rutaArchivo)
		if err != nil {
			pw.CloseWithError(err)
			return
		}
		defer archivo.Close()

		part, err := writer.CreateFormFile("file", rutaArchivo)
		if err != nil {
			pw.CloseWithError(err)
			return
		}

		_, err = io.Copy(part, archivo)
		if err != nil {
			pw.CloseWithError(err)
			return
		}
	}()

	req, err := http.NewRequest("POST", urlKubo, pr)
	if err != nil {
		return models.RespuestaKubo{}, fmt.Errorf("error creando petición HTTP: %v", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	cliente := &http.Client{}
	respuesta, err := cliente.Do(req)
	if err != nil {
		return models.RespuestaKubo{}, fmt.Errorf("error contactando a Kubo: %v", err)
	}
	defer respuesta.Body.Close()

	if respuesta.StatusCode != http.StatusOK {
		return models.RespuestaKubo{}, fmt.Errorf("kubo rechazó el archivo. Status: %d", respuesta.StatusCode)
	}

	var KuboRes models.RespuestaKubo
	err = json.NewDecoder(respuesta.Body).Decode(&KuboRes)
	if err != nil {
		return models.RespuestaKubo{}, fmt.Errorf("error leyendo respuesta de Kubo: %v", err)
	}

	return KuboRes, nil
}
