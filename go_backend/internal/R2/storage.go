package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"

	"ipfs-gestion-archivos/internal/api"
	"ipfs-gestion-archivos/internal/ipfs"
	"ipfs-gestion-archivos/internal/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func InitR2Client() (*s3.Client, error) {
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKey := os.Getenv("R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("R2_SECRET_ACCESS_KEY")

	if accountID == "" || accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("Faltan credenciales de R2 en el entorno")
	}

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithRegion("auto"),
	)

	if err != nil {
		return nil, fmt.Errorf("Error en cargar la configuración de AWS: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID))
		o.UsePathStyle = true
	})

	log.Println("Cliente R2 inicializado correctamente")

	return client, nil
}

func TransferR2ToIPFS(client *s3.Client, bucketName string, objectKey string) error {

	//pr, pw := io.Pipe()

	go func() {
		out, err := client.GetObject(context.TODO(), &s3.GetObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(objectKey),
		})

		if err != nil {
			log.Printf("Error obteniendo objeto de R2: %v", err)
			//	pw.CloseWithError(err)
			return
		}

		defer out.Body.Close()

		nombreLimpio := path.Base(objectKey)
		kuboRespuesta, err := ipfs.SubirArchivo(out.Body, nombreLimpio)

		if err != nil {
			fmt.Printf("Error subiendo el archivo a ipfs: %v", err)
			return
		}

		log.Printf("Archivo subido a IPFS con éxito. CID generado: %s", kuboRespuesta)

		log.Printf("Procediendo a borrar el archivo original crudo de R2: %s", objectKey)
		_, errDel := client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
			Bucket: aws.String(bucketName),
			Key:    aws.String(objectKey),
		})

		if errDel != nil {
			log.Printf("Advertencia_ No se pudo borrar el original de R2: %v", errDel)
		} else {
			log.Println("Archivo original EXTERMINADO de R2 exitosamente. Costos ahorrados.")
		}

		errNotificacion := api.NotificarBackendTS(objectKey, kuboRespuesta)
		if errNotificacion != nil {
			fmt.Println("Fallo de comunicación con TS:", errNotificacion)
			return
		}

	}()

	log.Println("Ciclo del Obrero Go finalizado para:", objectKey)

	//io.Copy(io.Discard, pr)

	return nil
}

func ManejarExterminio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
		return
	}

	var body models.OrdenExterminio
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Error leyendo el JSON", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"Mensaje":"Orden de exterminio aceptada"}`))

	go func() {
		log.Printf("Ejecutando limpieza para el CID: %s", body.CID)

		ipfs.QuitarPin(body.CID)

		ipfs.EjecutarGC()

		log.Println("Bloques del CID eliminados de R2. Costos de almacenamiento = $0.")

	}()

}
