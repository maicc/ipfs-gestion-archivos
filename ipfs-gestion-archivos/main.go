package main

import (
	"fmt"
	"net/http"

	"ipfs-gestion-archivos/internal/handlers"
)

func main() {
	fmt.Println("🚀 Servidor IPFS-Engine iniciado en el puerto 8080...")

	// Maneja las rutas, apuntando a tu paquete handlers
	http.HandleFunc("/upload", handlers.ManejarUpload)

	// Inicia el server
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Printf("Error fatal al iniciar el servidor: %v\n", err)
	}
}
