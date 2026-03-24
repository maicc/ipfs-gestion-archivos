# Etapa 1: Construcción (Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
# Etapa 2: Producción (Runner)
FROM node:20-alpine
WORKDIR /app
# Solo copiamos los archivos necesarios de la etapa builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
# Instalamos solo las dependencias de producción para mantener la imagen ligera
RUN npm ci --omit=dev
EXPOSE 3000
# Comando para iniciar la app
CMD ["node", "build"]