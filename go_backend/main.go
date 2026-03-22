package main

import (
	"fmt"
	"net/http"

	storage "ipfs-gestion-archivos/internal/R2"
	"ipfs-gestion-archivos/internal/handlers"

	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	fmt.Println("🚀 Servidor IPFS-Engine iniciado en el puerto 8080...")

	clienteR2, error := storage.InitR2Client()
	if error != nil {
		panic(fmt.Sprintf("No se pudo conectar a R2 al iniciar: %v", error))
	}

	// Maneja las rutas, apuntando a tu paquete handlers
	http.HandleFunc("/upload", handlers.ManejarUpload)
	http.HandleFunc("/uploadR2", handlers.ManejarUploadR2(clienteR2))

	// Inicia el server
	err := http.ListenAndServe(":8082", nil)
	if err != nil {
		fmt.Printf("Error fatal al iniciar el servidor: %v\n", err)
	}
}
