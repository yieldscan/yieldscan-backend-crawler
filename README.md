# YieldScan Backend Crawler

## Overview:

This repo manages crawlers for the [YieldScan](https://yieldscan.app) backend. Crawlers fetch data via [polkadot/api](https://github.com/polkadot-js/api) from the node endpoints and store in our database.

## Development:

We are always working on improving our codebase, and welcome any suggestions or contributions.

### Contribution Guide:

1. Create an issue for the improvement.

2. Fork the repo and make changes.

3. Make a PR.

### Codebase Overview:

Important packages:

- [src/services/crawlers](https://github.com/yieldscan/yieldscan-backend-crawler/tree/master/src/services/crawlers): Crawlers fetches different data using the [polkadot/api](https://github.com/polkadot-js/api) and stores it in our database, here are some of them:

  - [validators](https://github.com/yieldscan/yieldscan-backend-crawler/blob/master/src/services/crawlers/validators.ts): We fetch elected, nextElected and waiting validators, then using the historic data we assign risk-score and calculate estimated staking rewards for each validator.
  - [council](https://github.com/yieldscan/yieldscan-backend-crawler/blob/master/src/services/crawlers/council.ts): For storing the council memebers and backers data in the database.
  - [historyData](https://github.com/yieldscan/yieldscan-backend-crawler/blob/master/src/services/crawlers/historyData.ts): Here we fetch and store historic data like eraPoints, totalEraPoints, slashes, etc. This data is then used for calculating estimated staking rewards and risk-score for active validators.

- [src/config](https://github.com/yieldscan/yieldscan-backend-crawler/tree/master/src/config): Here we define configurations for the application(supported networks, crawlers, etc).

- submodules:
  - [src/models](https://github.com/yieldscan/ys-models): Schema for the database.
  - [src/interfaces](https://github.com/yieldscan/ys-interfaces): Interfaces for the models.

### Development Guide:

#### Pre-requisite:

- MongoDb connection url, make sure you have a running mongodb instance.

  - this [article](https://zellwk.com/blog/local-mongodb/#:~:text=To%20connect%20to%20your%20local,databases%20in%20your%20local%20MongoDB.) can help setting an instance locally.

Clone this or forked repository:

```
git clone --recursive https://github.com/yieldscan/yieldscan-backend-crawler
```

Note: `--recursive` is for cloning the submodules. If you already have cloned the repository without the `--recursive` argument and now want to load it’s submodules you have to run `git submodule update --init` inside the main folder of the repo.

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
# MongoDb connection url
MONGODB_URI=<your mongodb connection url>

# Networks node endpoints
WS_KUSAMA_PROVIDER_URL='wss://kusama-rpc.polkadot.io'
WS_POLKADOT_PROVIDER_URL='wss://polkadot.api.onfinality.io/public-ws'
WS_WESTEND_PROVIDER_URL='wss://westend-rpc.polkadot.io'

NODE_ENV='development'

# Crawlers enabling
CRAWLER_ERA_POINTS_HISTORY_ENABLE=true
CRAWLER_VALIDATORS_ENABLED=true
CRAWLER_ACTIVE_NOMINATORS_ENABLED=true
CRAWLER_TOTAL_REWARD_HISTORY=true
CRAWLER_COUNCIL_ENABLED=true

# Run Testnetworks?
TESTNETS_ENABLED=true

domain='https://yieldscan.app'
LOG_LEVEL='silly'
```

Then just start the server with

For development:

```
npm run dev
```

It uses nodemon in development for livereloading ✌️

**IMPORTANT NOTE:** When creating the database for the first time, it would might take around 30-45 minutes for all data endpoints to start functioning.

For production use:

```
npm start
# or
npm run start
```

### Git commit

- Run `npm run git:commit` for commiting your code and follow the process.

## Docker:

You can run a docker container via -

```
docker run -e MONGODB_URI=<your mongodb connection url> -t sahilnanda/yieldscan-crawler
```

## Tests:

You can run tests via -

```
npm run test
```
