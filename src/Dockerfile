FROM node:5.4
COPY package.json /src/package.json
WORKDIR /src
RUN npm install
COPY moneybot.js /src
COPY tickerreply.js /src
CMD ["node", "/src/moneybot.js"]
