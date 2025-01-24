FROM node:22-alpine
ADD src /app
ENTRYPOINT  [ "node", "/app/index.js" ]
