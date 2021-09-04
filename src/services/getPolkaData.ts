import 'reflect-metadata';
import { Service, Inject, Container } from 'typedi';
import { ApiPromise, WsProvider } from '@polkadot/api';
import config from '../config';
import { wait } from './utils';
import Logger from '../loaders/logger';
Container.set('config', config);

@Service()
export default class GetPolkaData {
  @Inject('config')
  config;
  async runCrawlers() {
    const crawlers = this.config.crawlers;
    const networks = this.config.networks;

    await this.startMultipleCrawlers(networks, crawlers);
    // crawlers.forEach((crawler) => crawler.module.start(api));
  }

  async startMultipleCrawlers(networks, crawlers) {
    // api.on('error', async () => {
    //   Logger.error('Error: API crashed');
    //   await api.dissconnect();
    //   process.exit(1);
    // });
    for (let i = 0; i < networks.length; i++) {
      if (JSON.parse(process?.env?.TESTNETS_ENABLED) || !networks[i].testnet) {
        Logger.info('Network: ' + networks[i].name);
        await this.start(crawlers, networks[i]);
        Logger.info('wating 60 secs');
        await wait(60000);
      }
    }

    // networks.map(async (network) => {
    //   await this.start(crawlers, network);
    // });

    return await this.startMultipleCrawlers(networks, crawlers);
  }

  async start(crawlers, network) {
    const runApiCrawlers = async (apiCrawlers, networkInfo) => {
      let isError = true;
      const getPolkadotAPI = async (wsProviderUrl) => {
        const provider = new WsProvider(wsProviderUrl, false);
        await provider.connect();
        provider.on('error', async () => {
          Logger.error('Error: Unable to connect to the provider, exiting...');
          process.exit(1);
        });
        const api = await ApiPromise.create({ provider });
        api.on('error', async () => {
          Logger.error('Error: API crashed');
          await api.disconnect();
          process.exit(1);
        });
        api.on('disconnected', async () => {
          Logger.info('API has been disconnected from the endpoint');
          // await api.disconnect();
          if (isError) {
            process.exit(1);
          }
        });
        try {
          await api.isReady;
          Logger.info('API is ready!');
        } catch (error) {
          Logger.error('Error', error);
        }
        return [api, provider];
      };
      const enabledCrwlers = apiCrawlers.filter((crawler) => crawler.enabled == 'true');
      let [api, provider] = await getPolkadotAPI(networkInfo.wsProviderUrl);
      for (let i = 0; i < enabledCrwlers.length; i++) {
        await enabledCrwlers[i].module.start(api, networkInfo);
        await wait(5000);
      }

      isError = false;
      await api.disconnect();
      api = null;
      provider = null;
      return;
    };

    const runNonApiCrawlers = async (nonApiCrawlers, networkInfo) => {
      const enabledCrwlers = nonApiCrawlers.filter((crawler) => crawler.enabled == 'true');
      for (let i = 0; i < enabledCrwlers.length; i++) {
        await enabledCrwlers[i].module.start(networkInfo);
        await wait(5000);
      }
      return;
    };

    await runApiCrawlers(crawlers.apiCrawlers, network);
    await runNonApiCrawlers(crawlers.nonApiCrawlers, network);

    return;
  }
}
