# LLP Performance aggregator

[![Nest Logo](https://nestjs.com/img/logo_text.svg)](https://nestjs.com/)

## Install

* Node.js
* MySQL

## Setup

### 1. install node_modules

```bash
npm install
```

### 2. Prepare environment files

Copy environment files

```bash
cp .env.example .env
```

Create database `db_aggregate_llp_performance` and edit the `.env` if necessary

```dotenv
DB_HOST=<Mysql host>
DB_PORT=<Mysql port>
DB_USERNAME=<Mysql username>
DB_PASSWORD=<Mysql password>
```

### 3. Run migration

```bash
npm run migration:run
```

## Running the app

```bash
# development
$ npm run start api

# watch mode
$ npm run start:dev api

# production mode
$ npm run start:prod api
```

## Docker

```bash
# Build image
$ docker build -t aggregate-llp-performance .

# Run api
$ docker run -dp 3000:3000 -v $PWD/.env:/app/.env --name aggregate-llp-performance-api aggregate-llp-performance node dist/apps/api/main

# Run worker
$ docker run -dp 3001:3000 -v $PWD/.env:/app/.env --name aggregate-llp-performance-worker aggregate-llp-performance node dist/apps/worker/main

# Run crawler
$ docker run -dp 3002:3000 -v $PWD/.env:/app/.env --name aggregate-llp-performance-crawler aggregate-llp-performance node dist/apps/crawler/main

# Exec api
$ docker exec -it aggregate-llp-performance-api sh

# Exec worker
$ docker exec -it aggregate-llp-performance-worker sh

# Exec crawler
$ docker exec -it aggregate-llp-performance-crawler sh
```

## Generate migration

```bash
npm run migration:generate FileName
```
