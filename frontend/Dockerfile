# frontend/Dockerfile

# Stage 1: Build the React application
FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
# Copy the built assets from the Vite output folder ('dist') to Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Use custom nginx config with API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]