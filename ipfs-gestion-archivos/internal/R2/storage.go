package storage

import (
	"context"
	"fmt"
	"log"
	"os"
	"path"

	"ipfs-gestion-archivos/internal/api"
	"ipfs-gestion-archivos/internal/ipfs"

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
			fmt.Println("Error subiendo el archivo a ipfs")
		}

		errNotificacion := api.NotificarBackendTS(objectKey, kuboRespuesta)
		if errNotificacion != nil {
			fmt.Println("Fallo de comunicación con TS:", errNotificacion)
			return
		}

	}()

	log.Printf("Iniciando transferencia hacia IPFS del archivo: %s", objectKey)

	//io.Copy(io.Discard, pr)

	return nil
}
