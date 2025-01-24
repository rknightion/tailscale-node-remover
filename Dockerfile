FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* /
RUN npm ci && npm cache clean --force
ADD src .
ENTRYPOINT  [ "node", "index.js" ]
