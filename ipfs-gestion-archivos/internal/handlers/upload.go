package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"ipfs-gestion-archivos/internal/api"
	"ipfs-gestion-archivos/internal/ipfs"
	"ipfs-gestion-archivos/internal/models"
)

// ManejarUpload es tu controlador principal para la ruta /upload
func ManejarUpload(w http.ResponseWriter, r *http.Request) {
	manejarCors(w, r, "GET, POST, OPTIONS")
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != "POST" {
		http.Error(w, "El método tiene que ser post", http.StatusMethodNotAllowed)
		return
	}

	r.ParseMultipartForm(5 << 20)
	chunkIndex := r.FormValue("chunkIndex")
	totalChunks := r.FormValue("totalChunks")
	originalFileName := r.FormValue("originalFileName")
	finalname := r.FormValue("uuid-name")
	MimeType := r.FormValue("MimeType")
	tiempoActual := time.Now().UnixNano()

	fileBasicInfo := models.FileBasicInfo{
		OriginalName: originalFileName,
		MimeType:     MimeType,
	}

	chunkIndexNum, _ := strconv.Atoi(chunkIndex)
	totalChunksNum, _ := strconv.Atoi(totalChunks)

	nuevoNombre := fmt.Sprintf("%s_%d_%s.tmp", originalFileName, tiempoActual, chunkIndex)

	archivo, _, err := r.FormFile("files")
	if err != nil {
		fmt.Println("Error recibiendo el archivo", err)
		return
	}
	defer archivo.Close()

	saveFiles(archivo, finalname, nuevoNombre)

	response := models.RespuestaArchivo{
		Success: true,
		Message: "Archivo recibido",
	}

	fmt.Println("Archivo guardado con nombre: ", nuevoNombre)
	json.NewEncoder(w).Encode(response)

	if chunkIndexNum == (totalChunksNum - 1) {
		fmt.Println("Carga de chunks terminadas, comenzando ensamblaje...")
		go ensamblarArchivo(finalname, fileBasicInfo) // Se ejecuta en segundo plano!
	}
}

func manejarCors(w http.ResponseWriter, r *http.Request, methods string) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-methods", methods)
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")
}

func saveFiles(datos io.Reader, finalName string, nombreChunks string) {
	carpeta := "temp"
	directorioTempUnico := path.Join(carpeta, finalName)
	os.MkdirAll(directorioTempUnico, os.ModePerm)
	rutaCompleta := filepath.Join(directorioTempUnico, nombreChunks)
	archivoFisico, _ := os.Create(rutaCompleta)
	defer archivoFisico.Close()
	io.Copy(archivoFisico, datos)
}

func ensamblarArchivo(finalname string, fileBasicInfo models.FileBasicInfo) {
	carpeta := "uploads"
	carpetaTemp := filepath.Join("temp", finalname)
	os.MkdirAll(carpeta, os.ModePerm)
	archivos, _ := os.ReadDir(carpetaTemp)

	sort.Slice(archivos, func(i, j int) bool {
		nombreI := strings.TrimSuffix(archivos[i].Name(), ".tmp")
		nombreJ := strings.TrimSuffix(archivos[j].Name(), ".tmp")
		pedazosI := strings.Split(nombreI, "_")
		pedazosJ := strings.Split(nombreJ, "_")
		indiceI, _ := strconv.Atoi(pedazosI[len(pedazosI)-1])
		indiceJ, _ := strconv.Atoi(pedazosJ[len(pedazosJ)-1])
		return indiceI < indiceJ
	})

	rutaCompleta := filepath.Join(carpeta, finalname)
	archivoFisico, _ := os.Create(rutaCompleta)
	defer archivoFisico.Close()

	for _, archivoTemp := range archivos {
		rutaCompletaTemp := filepath.Join(carpetaTemp, archivoTemp.Name())
		parte, _ := os.Open(rutaCompletaTemp)
		io.Copy(archivoFisico, parte)
		parte.Close()
	}

	fmt.Println("1. Ensamblaje listo. Inyectando archivo individual a IPFS...")

	// ✨ AQUI ESTÁ LA MAGIA DE LA ARQUITECTURA ✨
	respuestaKubo, errIPFS := ipfs.SubirArchivo(rutaCompleta)
	if errIPFS != nil {
		fmt.Println("Fallo crítico al subir a IPFS:", errIPFS)
		return
	}

	fmt.Println("2. Archivo pineado con exito. Notificando a la API en TypeScript...")

	errNotificacion := api.NotificarBackendTS(finalname, fileBasicInfo.OriginalName, fileBasicInfo.MimeType, respuestaKubo)
	if errNotificacion != nil {
		fmt.Println("Fallo de comunicación con TS:", errNotificacion)
		return
	}

	fmt.Println("3. TypeScript confirmó la recepción del CID.")
	os.RemoveAll(carpetaTemp)
	fmt.Println("Ensamblaje finalizado y basura temporal destruida con exito.")
}
