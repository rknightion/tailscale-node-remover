FROM node:22-alpine
ADD src /app
CMD [ "node", "/app/index.js" ]
