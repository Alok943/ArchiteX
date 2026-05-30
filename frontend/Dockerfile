# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy lock files and package config
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Receive VITE_API_URL during build time
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build production bundle
RUN npm run build

# Serving stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
