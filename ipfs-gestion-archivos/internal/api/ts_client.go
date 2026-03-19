package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"ipfs-gestion-archivos/internal/models"
)

// NotificarBackendTS avisa al servidor de tu amigo que la subida a IPFS terminó
func NotificarBackendTS(keyR2 string, respuestaKubo models.RespuestaKubo) error {
	urlBase := os.Getenv("URL_BACKEND")
	if urlBase == "" {
		urlBase = "http://localhost:3000"
	}
	urlBackend := urlBase + "/api/file/confirmar-subida"

	payload := models.PayloadNew{
		KeyR2:         keyR2,
		RespuestaKubo: respuestaKubo,
	}

	datosJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error empaquetando el JSON: %v", err)
	}

	req, err := http.NewRequest("POST", urlBackend, bytes.NewBuffer(datosJSON))
	if err != nil {
		return fmt.Errorf("error creando la petición: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")

	cliente := &http.Client{Timeout: 10 * time.Second}
	respuesta, err := cliente.Do(req)
	if err != nil {
		return fmt.Errorf("el backend TS no responde: %v", err)
	}
	defer respuesta.Body.Close()

	if respuesta.StatusCode != http.StatusOK && respuesta.StatusCode != http.StatusCreated {
		return fmt.Errorf("TypeScript rechazó el registro. Código HTTP: %d", respuesta.StatusCode)
	}

	return nil
}
