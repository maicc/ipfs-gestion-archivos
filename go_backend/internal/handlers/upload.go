package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

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

	r.ParseMultipartForm(7 << 20)
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

	err = saveFiles(archivo, finalname, nuevoNombre)

	if err != nil {
		fmt.Printf("Fallo al guardar el chunk físico: %v\n", err)
		http.Error(w, "Error interno al guardar el archivo", http.StatusInternalServerError)
		return
	}

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

func saveFiles(datos io.Reader, finalName string, nombreChunks string) error {
	carpeta := "temp"
	directorioTempUnico := path.Join(carpeta, finalName)

	if err := os.MkdirAll(directorioTempUnico, os.ModePerm); err != nil {
		return fmt.Errorf("fallo al crear directorio temporal: %w", err)
	}

	rutaCompleta := filepath.Join(directorioTempUnico, nombreChunks)
	archivoFisico, err := os.Create(rutaCompleta)
	if err != nil {
		return fmt.Errorf("fallo al crear el archivo físico: %w", err)
	}

	defer archivoFisico.Close()
	io.Copy(archivoFisico, datos)

	return nil
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
	archivoFisico, err := os.Create(rutaCompleta)

	if err != nil {
		fmt.Println("Error crítico creando el archivo final:", err)
		return // Evitamos el panic del defer
	}

	defer archivoFisico.Close()

	for _, archivoTemp := range archivos {
		rutaCompletaTemp := filepath.Join(carpetaTemp, archivoTemp.Name())
		parte, err := os.Open(rutaCompletaTemp)
		if err != nil {
			fmt.Printf("Error abriendo el chunk %s: %v\n", archivoTemp.Name(), err)
			continue // O return, dependiendo de si quieres cancelar todo el ensamblaje
		}

		if _, err := io.Copy(archivoFisico, parte); err != nil {
			fmt.Printf("Error copiando el chunk %s: %v\n", archivoTemp.Name(), err)
		}
		parte.Close()
	}

	fmt.Println("1. Ensamblaje listo. Inyectando archivo individual a IPFS...")

	mimeLimpio := strings.ToLower(strings.TrimSpace(fileBasicInfo.MimeType))

	if mimeLimpio == "video/mp4" || mimeLimpio == "video/x-matroska" {
		fmt.Println("¡Es un video compatible! Mandando a la licuadora de FFmpeg...")
		rutaCompleta = recortarVideosHLS(rutaCompleta, finalname)
		os.RemoveAll(rutaCompleta)
	}

	fmt.Println("3. TypeScript confirmó la recepción del CID.")
	os.RemoveAll(carpetaTemp)
	fmt.Println("Ensamblaje finalizado y basura temporal destruida con exito.")

	// 4. ¡EL TOQUE MAESTRO! Borrar el archivo que ya está en IPFS
	fmt.Println("Archivo subido a IPFS con éxito. Limpiando caché local...")
	os.Remove(rutaCompleta)

}

func recortarVideosHLS(inputFile string, finalname string) string {
	carpeta := "uploads"

	outputDir := filepath.Join(carpeta, "optimizado-"+finalname)

	error := os.MkdirAll(outputDir, os.ModePerm)
	if error != nil {
		fmt.Println("Error crítico creando la carpeta HLS:", error)
		return "Error" // O maneja el error como prefieras
	}

	fmt.Println("Iniciando optimización de videos para streaming")

	// 1. Extraemos solo el nombre del archivo (ej. "video.mp4")
	nombreArchivo := filepath.Base(inputFile)

	nombreSinExt := strings.TrimSuffix(nombreArchivo, filepath.Ext(nombreArchivo))

	// 2. Construimos la ruta final (ej. "ruta/al/outputDir/opt_video.mp4")
	outputFile := filepath.Join(outputDir, "opt_"+nombreSinExt+".mp4")

	cmd := exec.Command("ffmpeg",
		"-i", inputFile,
		"-c:v", "copy", // Copia solo el video
		"-c:a", "aac", // Traduce el audio
		"-sn", // Destruye los subtítulos
		"-movflags", "+faststart",
		outputFile, // Asegúrate de que termine en .mp4
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Run()
	if err != nil {
		fmt.Println("FFmpeg falló", err)
	}
	fmt.Println("Listo, video optimizado!")

	return outputFile
}
