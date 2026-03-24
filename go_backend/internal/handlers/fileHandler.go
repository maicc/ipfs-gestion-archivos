package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"ipfs-gestion-archivos/internal/api"

	"github.com/aws/aws-sdk-go-v2/aws"
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

		// ------------------------------------------------------------------
		// ⚡ PASO 4: LA BIFURCACIÓN (IPFS GATEWAY vs CLOUDFLARE R2)
		// ------------------------------------------------------------------

		// CASO A: ¡Tiene 1 o más réplicas en IPFS!
		if metadata.ReplicasCount > 0 {
			fmt.Printf("CID %s tiene %d réplicas. Redirigiendo al Gateway IPFS...\n", metadata.CID, metadata.ReplicasCount)

			// Usamos la conexión con el nodo directa
			gatewayURL := fmt.Sprintf("http://ipfs_nodo:8080/ipfs/%s?filename=%s", metadata.CID, metadata.Name)

			// Hacemos que el navegador del usuario salte hacia IPFS (ahorro de ancho de banda al 100%)
			// 1. Go va y le toca la puerta al Gateway en secreto
			resp, err := http.Get(gatewayURL)
			if err != nil {
				fmt.Printf("Error conectando al Gateway: %v\n", err)
				http.Error(w, "Error obteniendo el archivo de la red descentralizada", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				fmt.Printf("El Gateway devolvió error: %d\n", resp.StatusCode)
				http.Error(w, "Error leyendo de la red descentralizada", http.StatusInternalServerError)
				return
			}

			// 2. Preparamos los Headers (igual que con R2)
			if metadata.Name != "" {
				w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, metadata.Name))
			}
			if metadata.MimeType != "" {
				w.Header().Set("Content-Type", metadata.MimeType)
			}
			if metadata.Size > 0 {
				w.Header().Set("Content-Length", fmt.Sprintf("%d", metadata.Size))
			}
			w.WriteHeader(http.StatusOK)

			// 3. 🌊 EL STREAMING MAGICO
			// Go pasa los bytes del Gateway al usuario sin gastar tu RAM y sin cambiar la URL
			_, err = io.Copy(w, resp.Body)
			if err != nil {
				fmt.Printf("Error durante el streaming desde IPFS al usuario: %v\n", err)
			}
			return // 🚨 Super importante este return para que no siga al Caso B
		}

		// CASO B: Aún no tiene réplicas. Lo streameamos directo desde Cloudflare R2.
		fmt.Printf("CID %s no tiene réplicas. Streameando desde R2...\n", metadata.CID)

		// 🚨 LEEMOS EL BUCKET DE TU ARCHIVO .env (como me mostraste en la imagen)
		bucketName := os.Getenv("R2_BUCKET_NAME")

		// Preparamos la búsqueda.
		// Nota: Estoy usando metadata.CID como la "Llave" del archivo en R2.
		// Si en tu upload lo guardaste usando el UUID (r2Key), tendrías que enviar ese r2Key desde TS también.
		objInput := &s3.GetObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(metadata.R2Key),
		}

		result, err := clienteR2.GetObject(context.TODO(), objInput)
		if err != nil {
			fmt.Printf("Error obteniendo el archivo de R2: %v\n", err)
			http.Error(w, "Error obteniendo el archivo del almacenamiento", http.StatusInternalServerError)
			return
		}
		defer result.Body.Close()

		// Escribimos los Headers
		if metadata.Name != "" {
			w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, metadata.Name))
		}
		if metadata.MimeType != "" {
			w.Header().Set("Content-Type", metadata.MimeType)
		}
		if metadata.Size > 0 {
			w.Header().Set("Content-Length", fmt.Sprintf("%d", metadata.Size))
		}
		w.WriteHeader(http.StatusOK)

		// 🌊 EL STREAMING DE BYTES
		_, err = io.Copy(w, result.Body)
		if err != nil {
			fmt.Printf("Error durante el streaming al usuario: %v\n", err)
		}
	}
}
