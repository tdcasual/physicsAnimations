FROM node:24-bookworm-slim AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --ignore-scripts && npm --prefix frontend ci --ignore-scripts

COPY . .
RUN npm run build:frontend

FROM node:24-bookworm-slim

ENV NODE_ENV=production
ENV PORT=4173

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*

RUN mkdir -p content

EXPOSE 4173

CMD ["npm", "start"]
