// @ts-nocheck
import { Container } from 'typedi';
import mongoose from 'mongoose';

import { wait, chunkArray } from '../utils';
import { IValidatorHistory } from '../../interfaces/IValidatorHistory';
import { isNil } from 'lodash';

module.exports = {
  start: async function (api, networkInfo) {
    const Logger = Container.get('logger');
    Logger.info('start historyData');
    const ValidatorHistory = Container.get(networkInfo.name + 'ValidatorHistory') as mongoose.Model<
      IValidatorHistory & mongoose.Document
    >;

    const eraIndex = await module.exports.getEraIndexes(api, ValidatorHistory);
    if (eraIndex.length !== 0) {
      Logger.info('fetching data for eras:');
      Logger.info(eraIndex);
      await module.exports.storeValidatorHistory(api, eraIndex, ValidatorHistory);
    } else {
      Logger.info('historic data is updated to latest');
    }
    Logger.info('stop historyData');
    return;
  },

  getSlashes: async function (api, pointsHistory) {
    const slashes = {};

    for (let i = 0; i < pointsHistory.length; i++) {
      const individuals = Object.keys(pointsHistory[i].erasRewardPoints.validators).filter(
        (x) => !Object.keys(slashes).includes(x),
      );

      const slashInfo = [];

      const chunkedArr = chunkArray(individuals, 50);

      for (let j = 0; j < chunkedArr.length; j++) {
        const info = await Promise.all(chunkedArr[j].map((val) => api.derive.staking.ownSlashes(val)));
        slashInfo.push(...info);
        await wait(500);
      }

      individuals.map((x, index) => {
        slashes[x] = slashInfo[index];
      });
    }
    return slashes;
  },

  getEraIndexes: async function (api, ValidatorHistory) {
    const Logger = Container.get('logger');
    const lastIndexDB = await ValidatorHistory.find({}).sort({ eraIndex: -1 }).limit(1);
    const historyDepth = await api.consts.staking.historyDepth;
    const currentEra = await api.query.staking.currentEra();
    const lastAvailableEra = Math.max(1, currentEra - historyDepth);

    Logger.info(`activeEra ${parseInt(currentEra)}, db synced to era: ${lastIndexDB[0]?.eraIndex}`);

    // check whether there is any previous data available inside the DB
    if (lastIndexDB.length !== 0) {
      // check whether available eraIndex from DB is not very old
      if (lastIndexDB[0].eraIndex >= lastAvailableEra) {
        const indexCount = currentEra - lastIndexDB[0].eraIndex - 1;
        const eraIndex = [...Array(indexCount).keys()].map((i) => i + (lastIndexDB[0].eraIndex + 1));
        return eraIndex;
      }
    }
    const eraIndex = [...Array(historyDepth.toNumber()).keys()].map((i) => i + lastAvailableEra);
    return eraIndex;
  },

  storeValidatorHistory: async function (api, eraIndex, ValidatorHistory) {
    const Logger = Container.get('logger');
    const erasRewardPointsArr = await api.derive.staking.erasPoints();
    const pointsHistory = eraIndex.reduce((acc, i) => {
      const eraPoints = erasRewardPointsArr.filter((info) => parseInt(info.era.toString()) === i)[0];
      if (!isNil(eraPoints)) {
        acc.push({ eraIndex: i, erasRewardPoints: eraPoints });
      }
      return acc;
    }, []);

    Logger.info('getting slash info');
    // const slashes = await module.exports.getSlashes(api, pointsHistory);
    const slashes = {};

    Logger.info('getting val exposure and prefs');
    for (let i = 0; i < pointsHistory.length; i++) {
      const rewards: Array<IValidatorHistory> = [];

      const chunkedArr = chunkArray(Object.keys(pointsHistory[i].erasRewardPoints.validators), 100);

      const valExposure2 = [];
      const valPrefs2 = [];
      for (let j = 0; j < chunkedArr.length; j++) {
        const chunkExposure = await Promise.all(
          chunkedArr[j].map((x) => api.query.staking.erasStakers(pointsHistory[i].eraIndex, x.toString())),
        );

        valExposure2.push(...chunkExposure);

        const chunkPrefs = await Promise.all(
          chunkedArr[j].map((x) => api.query.staking.erasValidatorPrefs(pointsHistory[i].eraIndex, x.toString())),
        );

        valPrefs2.push(...chunkPrefs);
      }

      Logger.info('waiting 5s');
      await wait(5000);

      Object.keys(pointsHistory[i].erasRewardPoints.validators).forEach((y, index) => {
        const nominatorsInfo = valExposure2[index].others.map((x) => {
          const nomId = x.who.toString();
          return {
            nomId: nomId,
            nomStake: parseInt(x.value),
          };
        });
        // const slashInfo = slashes[y].filter((x) => parseInt(x.era) == pointsHistory[i].eraIndex);
        rewards.push({
          stashId: y,
          commission: parseInt(valPrefs2[index].commission),
          eraIndex: pointsHistory[i].eraIndex,
          eraPoints: parseInt(pointsHistory[i].erasRewardPoints.validators[y]),
          totalEraPoints: parseInt(pointsHistory[i].erasRewardPoints.eraPoints),
          totalStake: parseInt(valExposure2[index].total),
          nominatorsInfo: nominatorsInfo,
          // slashCount: slashInfo[0] !== undefined ? parseInt(slashInfo[0].total) : 0,
        });
      });

      // insert data into DB
      if (rewards.length > 0) {
        try {
          await ValidatorHistory.insertMany(rewards);
          Logger.info(`db synced to era: ${rewards[0]?.eraIndex}`);
        } catch (error) {
          Logger.error('Error while updating validator history data', error);
        }
      }
    }
    return;
  },
};
