FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace=@momentum/api --ignore-scripts && npm cache clean --force
COPY apps/api apps/api
COPY database database
COPY scripts/migrate.cjs scripts/migrate.cjs
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
EXPOSE 3001
CMD ["node", "apps/api/server.js"]
