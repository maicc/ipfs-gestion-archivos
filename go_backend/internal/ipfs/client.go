package ipfs

import (
	"encoding/json"
	"fmt"
	"io"
	"ipfs-gestion-archivos/internal/models" // Cambia "oguripfs-backend" si tu go.mod se llama diferente
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"
	"path/filepath"
	"time"
)

// SubirArchivo streamea un archivo físico directamente a tu nodo Kubo loca
func SubirArchivo(archivoR2 io.Reader, nombreArchivo string) (models.RespuestaKubo, error) {
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

		part, err := writer.CreateFormFile("file", nombreArchivo)
		if err != nil {
			pw.CloseWithError(err)
			return
		}

		_, err = io.Copy(part, archivoR2)
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

	cliente := &http.Client{
		Timeout: time.Minute * 30,
	}
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

func SubirCarpetaAIPFS(rutaCarpeta string) (models.RespuestaKubo, error) {
	urlbase := os.Getenv("IPFS_URL")
	if urlbase == "" {
		urlbase = "http://127.0.0.1:5001"
	}

	urlKubo := urlbase + "/api/v0/add?pin=true&cid-version=1"

	pr, pw := io.Pipe()
	writer := multipart.NewWriter(pw)

	// Obtenemos el nombre final de la carpeta (ej: "hls-mivideo.mp4")
	nombreCarpeta := filepath.Base(rutaCarpeta)

	go func() {
		defer pw.Close()
		defer writer.Close()

		// 1. EL TRUCO DE LA CARPETA: Declaramos el directorio raíz
		hDir := make(textproto.MIMEHeader)
		hDir.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, nombreCarpeta))
		hDir.Set("Content-Type", "application/x-directory")
		_, err := writer.CreatePart(hDir)
		if err != nil {
			pw.CloseWithError(err)
			return
		}

		// 2. Leemos todo lo que hay dentro de tu carpeta HLS
		archivos, err := os.ReadDir(rutaCarpeta)
		if err != nil {
			pw.CloseWithError(err)
			return
		}

		// 3. Iteramos e inyectamos archivo por archivo
		for _, archivoInfo := range archivos {
			if archivoInfo.IsDir() {
				continue // Ignoramos subcarpetas por seguridad
			}

			rutaArchivo := filepath.Join(rutaCarpeta, archivoInfo.Name())
			archivo, err := os.Open(rutaArchivo)
			if err != nil {
				pw.CloseWithError(err)
				return
			}

			// Le decimos a IPFS que este archivo vive DENTRO de la carpeta
			hArchivo := make(textproto.MIMEHeader)
			rutaRelativa := fmt.Sprintf("%s/%s", nombreCarpeta, archivoInfo.Name())
			hArchivo.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, rutaRelativa))
			hArchivo.Set("Content-Type", "application/octet-stream")

			part, err := writer.CreatePart(hArchivo)
			if err != nil {
				archivo.Close()
				pw.CloseWithError(err)
				return
			}

			_, err = io.Copy(part, archivo)
			archivo.Close()
			if err != nil {
				pw.CloseWithError(err)
				return
			}
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
		return models.RespuestaKubo{}, fmt.Errorf("kubo rechazó la carpeta. Status: %d", respuesta.StatusCode)
	}

	// 4. EL TRUCO NDJSON: Leer el stream completo hasta agarrar el último JSON
	var ultimaRespuesta models.RespuestaKubo
	decoder := json.NewDecoder(respuesta.Body)

	for {
		var temp models.RespuestaKubo
		err := decoder.Decode(&temp)
		if err == io.EOF {
			break // Ya no hay más respuestas, terminamos de leer
		}
		if err != nil {
			return models.RespuestaKubo{}, fmt.Errorf("error leyendo respuesta de Kubo: %v", err)
		}
		ultimaRespuesta = temp // Sobrescribimos hasta quedarnos con el de la carpeta raíz
	}

	// Retornamos el CID maestroo
	return ultimaRespuesta, nil
}

func QuitarPin(cid string) error {

	urlbase := os.Getenv("IPFS_URL")
	if urlbase == "" {
		urlbase = "http://127.0.0.1:5001"
	}

	urlKubo := urlbase + "/api/v0"

	url := fmt.Sprintf("%s/pin/rm?arg=%s", urlKubo, cid)

	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return err
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Error conectando al nodo IPFS local: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Fallo al quitar el pin en IPFS, status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func EjecutarGC() error {

	urlbase := os.Getenv("IPFS_URL")
	if urlbase == "" {
		urlbase = "http://127.0.0.1:5001"
	}

	urlKubo := urlbase + "/api/v0"

	url := fmt.Sprintf("%s/repo/gc", urlKubo)

	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return err
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("Error ejecutando el recolector de basura : %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Fallo al ejecutar GC, status %d: %s", resp.StatusCode, string(bodyBytes))
	}
	return nil
}
