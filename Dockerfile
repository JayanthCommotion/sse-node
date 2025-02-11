FROM node:alpine AS base
WORKDIR /usr/src/app
COPY package* .
RUN npm i install
EXPOSE 3501

# This is for development (using nodemon)
FROM base AS development
COPY . .
CMD ["npm","run","start:dev"]

# This is for production (using node)
FROM base AS production
COPY . .
CMD ["npm","run","start"]