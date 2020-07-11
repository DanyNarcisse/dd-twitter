FROM node:12-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY --chown=node:node package*.json ./
COPY --chown=node:node getTweets.js ./
COPY --chown=node:node credentials.js ./

RUN npm install

CMD [ "npm", "start" ]