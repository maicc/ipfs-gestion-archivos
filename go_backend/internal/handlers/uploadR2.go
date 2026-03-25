package handlers

import (
	"encoding/json"
	"fmt"
	storage "ipfs-gestion-archivos/internal/R2"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Definimos lo que esperamos recibir de TypeScript
type DisparadorTS struct {
	KeyR2 string `json:"keyR2"`
}

// Esta función "envuelve" a tu handler real para poder pasarle el s3.Client
func ManejarUploadR2(clienteR2 *s3.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Validamos que sea un POST
		if r.Method != http.MethodPost {
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}

		// 2. Leemos el JSON que manda TypeScript
		var body DisparadorTS
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "Error leyendo el JSON", http.StatusBadRequest)
			return
		}

		// 3. Obtenemos el nombre del bucket de tus variables de entorno
		bucketName := os.Getenv("R2_BUCKET_NAME")

		go func() {
			err := storage.TransferR2ToIPFS(clienteR2, bucketName, body.KeyR2)
			if err != nil {
				fmt.Println("Error catastrófico en la transferencia:", err)

			}
		}()

		// 5. Le respondemos a TS que ya empezamos a trabajar
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"mensaje": "Transferencia R2 -> IPFS iniciada correctamente"}`))
	}
}
