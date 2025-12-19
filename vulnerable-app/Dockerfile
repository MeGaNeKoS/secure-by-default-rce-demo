# Dockerfile for a production Next.js app

# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Prepare ----
# Intermediate stage to assemble the app structure and install runtime deps
FROM node:20-alpine AS prepare
WORKDIR /app
# Copy standalone output from build
COPY --from=build /app/.next/standalone ./
# Install axios explicitly to match original behavior
RUN npm install axios

# ---- Runner ----
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
# Copy the prepared application code (including node_modules with axios)
COPY --from=prepare /app ./

# Expose the port the app runs on
EXPOSE 3000

# Start the server with inline logging wrapper (no new files, no shell)
CMD ["server.js"]