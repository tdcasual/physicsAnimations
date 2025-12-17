FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=4173

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .

RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*

RUN mkdir -p content

EXPOSE 4173

CMD ["npm", "start"]
