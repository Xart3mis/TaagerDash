# Dev-only Dockerfile — runs the Vite dev server for local docker compose.
# Production frontend is built in CI and deployed to S3+CloudFront (no container).
FROM node:20-alpine

WORKDIR /app

# Install dependencies before copying source for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Source is bind-mounted at runtime via docker-compose volumes
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
