# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (Nginx Optimized Web Server)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx conf to proxy routes and handle React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
