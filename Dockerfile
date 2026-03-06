FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --ignore-scripts && npm --prefix frontend ci --ignore-scripts

COPY . .
RUN npm run build:frontend

FROM node:24-bookworm-slim AS runtime-base

ENV NODE_ENV=production
ENV PORT=4173

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p content

EXPOSE 4173

CMD ["npm", "start"]

FROM runtime-base AS runtime-browser
RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*

FROM runtime-base AS runtime
