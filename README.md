# YieldScan Backend Crawler

## Overview:

This repo manages crawlers for the [YieldScan](https://yieldscan.app) backend. Crawlers fetch data via [polkadot/api](https://github.com/polkadot-js/api) from the node endpoints and store in our database.

## Development:

We are always working on improving our codebase, and welcome any suggestions or contributions.

### Contribution Guide:

1. Create an issue for the improvement: this helps in saving valuable time incase anyone else is working on the same.

2. Fork the repo and do changes.

3. Make a PR to `devlop` branch.

### Development Guide:

Clone the repository:

```
git clone https://github.com/yieldscan/yieldscan-backend-crawler
```

cd into the main folder:

```
cd yieldscan-backend-crawler
```

The first time, you will need to run:

```
  npm install
```

Define the following environment variables in a `.env` file inside the main folder:

```
MONGODB_URI=<your mongodb connection url>
WS_KUSAMA_PROVIDER_URL='wss://kusama-rpc.polkadot.io'
WS_POLKADOT_PROVIDER_URL='wss://polkadot.api.onfinality.io/public-ws'
WS_WESTEND_PROVIDER_URL='wss://westend-rpc.polkadot.io'
NODE_ENV='development'
CRAWLER_ERA_POINTS_HISTORY_ENABLE=true
CRAWLER_VALIDATORS_ENABLED=true
CRAWLER_ACTIVE_NOMINATORS_ENABLED=true
TESTNETS_ENABLED=true
CRAWLER_TOTAL_REWARD_HISTORY=true
CRAWLER_COUNCIL_ENABLED=true
domain='https://yieldscan.app'
LOG_LEVEL='silly'
```

Then just start the server with

For production:

```
npm start
```

For development:

```
npm run dev
```

It uses nodemon in development for livereloading ✌️

**IMPORTANT NOTE:** When creating the database for the first time, it would might take around 30-45 minutes for all data endpoints to start functioning.

## Docker:

You can run a docker container via -

```
docker run -e MONGODB_URI=<your mongodb connection url> -t sahilnanda/yieldscan-crawler
```

## Tests:

You can run tests via

```
npm run test
```

## Codebase Guide:

### Codebase Overview:

Important packages:

- [src/config](https://github.com/yieldscan/yieldscan-backend-crawler/tree/master/src/config): Here we define configurations for the application(supported networks, crawlers, etc).
- [src/models](https://github.com/yieldscan/yieldscan-backend-crawler/tree/master/src/models): Schema for the database.
- [src/interfaces](https://github.com/yieldscan/yieldscan-backend-crawler/tree/master/src/interfaces): Interfaces for the models.
- [src/services](https://github.com/yieldscan/yieldscan-backend-crawler/tree/master/src/services): Here we define different crawlers.

### Git commit

- Run `npm run git:commit` for commiting your code and follow the process.
