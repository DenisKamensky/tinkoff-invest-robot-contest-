FROM node

COPY . /usr/src/app

WORKDIR /usr/src/app

RUN npm install yarn

RUN yarn

CMD ["npm", "start"]
