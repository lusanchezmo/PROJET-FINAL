# Etapa 1: Compilar la aplicación de Lovable
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Etapa 2: Servir los archivos con Nginx
FROM nginx:alpine

# 🔥 LÍNEA NUEVA: Borra por la fuerza la configuración por defecto y su pantalla de bienvenida
RUN rm /etc/nginx/conf.d/default.conf

# Copiar tu configuración personalizada y tus archivos de Lovable
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]