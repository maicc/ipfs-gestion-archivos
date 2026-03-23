FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

RUN apk add --no-cache python3 make g++ && \
    npm install -g @crustio/crust-cli

COPY --from=builder /app/dist ./dist

COPY prisma ./prisma

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]