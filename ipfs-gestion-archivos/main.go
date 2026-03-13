package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"

	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type RespuestaArchivo struct {
	Success bool   `json:"sucess"`
	Message string `json:"message"`
}

type RespuestaKubo struct {
	Name string `json:"Name"`
	Hash string `json:"Hash"`
	Size string `json:"Size"`
}

type PayloadVideo struct {
	UUID string `json:"uuid"`
	CID  string `json:"cid"`
	SIZE string `json:"size"`
}

func main() {
	fmt.Println("Hola, mundo")

	//Maneja las rutas
	http.HandleFunc("/upload", manejador)
	//Inicia el server
	http.ListenAndServe(":8080", nil)
}

func manejador(w http.ResponseWriter, r *http.Request) {
	manejarCors(w, r, "GET, POST, OPTIONS")
	//Evita que hagan una perición con un método el cual no es el esperado
	if r.Method != "POST" {
		http.Error(w, "El método tiene que ser post", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(5 << 20)
	chunkIndex := r.FormValue("chunkIndex")
	totalChunks := r.FormValue("totalChunks")
	originalFileName := r.FormValue("originalFileName")
	finalname := r.FormValue("uuid-name")
	tiempoActual := time.Now().UnixNano()

	chunkIndexNum, err := strconv.Atoi(chunkIndex)
	totalChunksNum, err := strconv.Atoi(totalChunks)

	nuevoNombre := fmt.Sprintf("%s_%d_%s.tmp", originalFileName, tiempoActual, chunkIndex)

	archivo, _, err := r.FormFile("files")

	if err != nil {
		fmt.Println("Error recibiendo el archivo", err)
		return
	}

	defer archivo.Close()

	saveFiles(archivo, finalname, nuevoNombre)

	fmt.Println("Archivo guardado con nombre: ", nuevoNombre)

	//fmt.Println("Archivo recibido", infoArchivo.Filename)

	response := RespuestaArchivo{
		Success: true,
		Message: "Archivo recibido",
	}

	json.NewEncoder(w).Encode(response)

	fmt.Println("Carga de chunks terminadas, comenzando ensamblaje...")
	if chunkIndexNum == (totalChunksNum - 1) {
		go emsablarArchivo(finalname)
	}

}

func manejarCors(w http.ResponseWriter, r *http.Request, methods string) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-methods", methods)
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
}

func saveFiles(datos io.Reader, finalName string, nombreChunks string) {
	carpeta := "temp"
	directorioTempUnico := path.Join(carpeta, finalName)
	err := os.MkdirAll(directorioTempUnico, os.ModePerm)

	if err != nil {
		fmt.Println("Ha ocurrido un error al crear la carpeta", err)
		return
	}

	rutaCompleta := filepath.Join(directorioTempUnico, nombreChunks)

	archivoFisico, err := os.Create(rutaCompleta)

	if err != nil {
		fmt.Println("Ocurrio un error al guardar el chunk", err)
		return
	}

	defer archivoFisico.Close()

	_, err = io.Copy(archivoFisico, datos)
	if err != nil {
		fmt.Println("Error escribiendo en el disco", err)
		return
	}
}

func emsablarArchivo(finalname string) {
	carpeta := "uploads"
	carpetaTemp := filepath.Join("temp", finalname)
	fmt.Println(finalname, "hola")
	err := os.MkdirAll(carpeta, os.ModePerm)
	archivos, err := os.ReadDir(carpetaTemp)

	if err != nil {
		fmt.Println("Ha ocurrido un error al leer los archivos", err)
		return
	}

	sort.Slice(archivos, func(i, j int) bool {
		nombreI := archivos[i].Name()
		nombreJ := archivos[j].Name()

		nombreI = strings.TrimSuffix(nombreI, ".tmp")
		nombreJ = strings.TrimSuffix(nombreJ, ".tmp")

		pedazosI := strings.Split(nombreI, "_")
		pedazosJ := strings.Split(nombreJ, "_")

		indiceI, _ := strconv.Atoi(pedazosI[len(pedazosI)-1])
		indiceJ, _ := strconv.Atoi(pedazosJ[len(pedazosJ)-1])

		return indiceI < indiceJ
	})

	rutaCompleta := filepath.Join(carpeta, finalname)

	archivoFisico, err := os.Create(rutaCompleta)

	if err != nil {
		fmt.Print("Error al guardar el archivo nuevo", err)
		return
	}
	defer archivoFisico.Close()

	for _, archivoTemp := range archivos {

		rutaCompleta := filepath.Join(carpetaTemp, archivoTemp.Name())
		parte, err := os.Open(rutaCompleta)

		if err != nil {
			fmt.Println("Error abrir los archivos", err)
			return
		}

		io.Copy(archivoFisico, parte)
		parte.Close()

	}

	fmt.Println("1. Ensamblaje listo. Inyectando archivo individual a IPFS...")

	respuestaKubo, errIPFS := subirArchivoKuboHTTP(rutaCompleta)

	fmt.Println("Tamaño final del archivo: ", respuestaKubo.Size)
	if errIPFS != nil {
		fmt.Println("Fallo crítico al subir a IPFS:", errIPFS)
		return
	}

	fmt.Println("Archivo pineado con extio. CID:", respuestaKubo)
	fmt.Println("3. Notificando a la API en TypeScript")

	errNotificacion := notificarBackendTS(finalname, respuestaKubo)
	if errNotificacion != nil {
		fmt.Println("Fallo de comunicación con TS:", errNotificacion)
		return
	}

	fmt.Println("TypeScript confirmó la recepción del CID.")

	linkGateway := fmt.Sprintf("https://dweb.link/ipfs/%s, https://ipfs.io/ipfs/%s", respuestaKubo.Hash, respuestaKubo.Hash)

	fmt.Println("Archivo pineado con éxito! CID: ", respuestaKubo.Hash)
	fmt.Println("Link: ", linkGateway)
	errLimpieza := os.RemoveAll(carpetaTemp)
	if errLimpieza != nil {
		fmt.Println("Advertencia: No se pudo borrar la basura temporal: ", errLimpieza)

	} else {
		fmt.Println("Ensamblaje finalizado y habitación temporal destruida con exito")
	}

}

func subirArchivoKuboHTTP(rutaArchivo string) (RespuestaKubo, error) {

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
		return RespuestaKubo{}, fmt.Errorf("error creando petición HTTP: %v", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	cliente := &http.Client{}
	respuesta, err := cliente.Do(req)
	if err != nil {
		return RespuestaKubo{}, fmt.Errorf("Error contactando a Kubo %v", err)
	}
	defer respuesta.Body.Close()

	if respuesta.StatusCode != http.StatusOK {
		return RespuestaKubo{}, fmt.Errorf("Kubo rechazó el archivo. Status: %d", respuesta.StatusCode)
	}

	var KuboRes RespuestaKubo
	err = json.NewDecoder(respuesta.Body).Decode(&KuboRes)
	if err != nil {
		return RespuestaKubo{}, fmt.Errorf("Error leyendo respuesta de Kubo: %v", err)
	}

	fmt.Println("Información real del tamaño: ", KuboRes)

	return KuboRes, nil

}

func notificarBackendTS(uuidVideo string, respuestaKubo RespuestaKubo) error {

	urlBase := os.Getenv("URL_BACKEND")

	if urlBase == "" {
		urlBase = "http://localhost:3000"
	}

	urlBackend := urlBase + "/api/file/videos/confirmar-subida"

	payload := PayloadVideo{
		UUID: uuidVideo,
		CID:  respuestaKubo.Hash,
		SIZE: respuestaKubo.Size,
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
