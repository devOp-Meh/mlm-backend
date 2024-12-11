FROM node:18-alpine

WORKDIR /app

RUN npm install 

RUN npm run test

EXPOSE 5000

CMD ["node", "server.js"]
