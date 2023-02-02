// @ts-nocheck
import mongoose from 'mongoose';
import { Container } from 'typedi';

import { IStakingInfo } from '../../interfaces/IStakingInfo';
import { ITotalRewardHistory } from '../../interfaces/ITotalRewardHistory';
import { IValidatorHistory } from '../../interfaces/IValidatorHistory';
import { IActiveNominators } from '../../interfaces/IActiveNominators';
import { INominatorStats } from '../../interfaces/INominatorStats';
import { wait } from '../utils';
import { isNil } from 'lodash';

module.exports = {
  start: async function (networkInfo) {
    const Logger = Container.get('logger');
    Logger.info('start activeNominators');
    const Validators = Container.get(networkInfo.name + 'Validators') as mongoose.Model<
      IStakingInfo & mongoose.Document
    >;
    const validators = await Validators.find({});

    // const distinctNominators = await Validators.distinct('nominators.nomId');

    const nominatorsInfo = await module.exports.getNominatorsInfo(validators);

    Logger.info('waiting 5 secs');
    await wait(5000);

    await module.exports.getDailyEarnings(nominatorsInfo, networkInfo);
    await module.exports.getNominatorStats(Object.values(nominatorsInfo), networkInfo);

    Logger.info('stop activeNominators');
    return;
  },

  getNominatorsInfo: async function (validators) {
    // const result = [];
    const Logger = Container.get('logger');
    const resultObj = {};
    validators.map((x) => {
      const estimatedPoolReward = x.estimatedPoolReward;
      const riskScore = x.riskScore;
      x.nominators.map((y) => {
        if (isNil(resultObj[y.nomId])) {
          resultObj[y.nomId] = {
            nomId: y.nomId,
            validatorsInfo: [
              {
                stashId: x.stashId,
                commission: x.commission,
                totalStake: x.totalStake,
                nomStake: y.stake,
                riskScore: riskScore,
                isElected: x.isElected,
                isNextElected: x.isNextElected,
                isWaiting: x.isWaiting,
                claimedRewards: x.claimedRewards,
                estimatedPoolReward: estimatedPoolReward,
                estimatedReward: x.isElected
                  ? ((estimatedPoolReward - (x.commission / Math.pow(10, 9)) * estimatedPoolReward) * y.stake) /
                    x.totalStake
                  : null,
              },
            ],
          };
        } else {
          resultObj[y.nomId].validatorsInfo.push({
            stashId: x.stashId,
            commission: x.commission,
            totalStake: x.totalStake,
            nomStake: y.stake,
            riskScore: riskScore,
            isElected: x.isElected,
            isNextElected: x.isNextElected,
            isWaiting: x.isWaiting,
            claimedRewards: x.claimedRewards,
            estimatedPoolReward: estimatedPoolReward,
            estimatedReward: x.isElected
              ? ((estimatedPoolReward - (x.commission / Math.pow(10, 9)) * estimatedPoolReward) * y.stake) /
                x.totalStake
              : null,
          });
        }
      });
    });
    Logger.info('nominators count');
    Logger.info(Object.keys(resultObj).length);
    return resultObj;
  },
  getDailyEarnings: async function (nominatorsInfo, networkInfo) {
    const Logger = Container.get('logger');
    const TotalRewardHistory = Container.get(networkInfo.name + 'TotalRewardHistory') as mongoose.Model<
      ITotalRewardHistory & mongoose.Document
    >;
    const numberOfErasPerDay = networkInfo.erasPerDay;
    const lastIndexDB = await TotalRewardHistory.find({}).sort({ eraIndex: -1 }).limit(numberOfErasPerDay);
    const ValidatorHistory = Container.get(networkInfo.name + 'ValidatorHistory') as mongoose.Model<
      IValidatorHistory & mongoose.Document
    >;
    const eraIndexArr = lastIndexDB.map((x) => x.eraIndex);
    const decimalPlaces = networkInfo.decimalPlaces;
    const previous4ErasData = await ValidatorHistory.find({ eraIndex: { $in: eraIndexArr } });
    previous4ErasData.map((x) => {
      const totalReward =
        lastIndexDB.filter((y) => y.eraIndex == x.eraIndex)[0].eraTotalReward / Math.pow(10, decimalPlaces);
      const poolReward = (totalReward * x.eraPoints) / x.totalEraPoints;
      const commission = x.commission / Math.pow(10, 9);
      x.nominatorsInfo.map((nom) => {
        const nomReward = (poolReward - commission * poolReward) * (nom.nomStake / x.totalStake);
        if (nominatorsInfo[nom.nomId]) {
          if (isNil(nominatorsInfo[nom.nomId]?.nomReward)) {
            nominatorsInfo[nom.nomId].nomReward = [];
          }
          nominatorsInfo[nom.nomId].nomReward.push(nomReward);
        }
      });
    });
    // nominatorsInfo.map((x) => {
    //   x.dailyEarnings = individualHistory.reduce((a, b) => a + b.nomReward, 0);
    // });
    Object.keys(nominatorsInfo).map((nomId) => {
      nominatorsInfo[nomId].dailyEarnings =
        nominatorsInfo[nomId]?.nomReward && nominatorsInfo[nomId].nomReward.reduce((a, b) => a + b, 0);
    });
    const ActiveNominators = Container.get(networkInfo.name + 'ActiveNominators') as mongoose.Model<
      IActiveNominators & mongoose.Document
    >;

    const oldNominators = await ActiveNominators.find({}, { nomId: 1, _id: 0 });

    const inactiveNominators = oldNominators
      .filter((nom) => !Object.keys(nominatorsInfo).includes(nom.nomId))
      .map((nom) => nom.nomId);

    Logger.info('updating');
    await module.exports.updateDB(ActiveNominators, nominatorsInfo, Logger);
    Logger.info('updated');

    Logger.info('waiting 5 secs');
    await wait(5000);

    Logger.info('removing');
    await module.exports.removeInactiveFromDB(ActiveNominators, inactiveNominators, Logger);
    Logger.info('removed');

    Logger.info('updated nominators data');

    return;
  },
  getNominatorStats: async function (nominatorsInfo, networkInfo) {
    const Logger = Container.get('logger');
    Logger.info('nominator stats');
    let nomMinStake = Infinity;
    const nomCount = nominatorsInfo.filter((nom) => nom.validatorsInfo.some((val) => val.isElected == true)).length;
    const totalRewards = nominatorsInfo
      .filter((nom) => nom.validatorsInfo.some((val) => val.isElected == true))
      .reduce((a, b) => (b.dailyEarnings ? a + b.dailyEarnings : a), 0);
    const totalAmountStaked = nominatorsInfo
      .filter((nom) => nom.validatorsInfo.some((val) => val.isElected == true))
      .reduce((a, b) => {
        const nomtotalStake = b.validatorsInfo.reduce((x, y) => {
          return y.nomStake !== (null || undefined) ? x + y.nomStake : x;
        }, 0);
        nomMinStake = Math.min(nomMinStake, nomtotalStake);
        return a + nomtotalStake / Math.pow(10, networkInfo.decimalPlaces);
      }, 0);

    nomMinStake = nomMinStake / Math.pow(10, networkInfo.decimalPlaces);

    const NominatorStats = Container.get(networkInfo.name + 'NominatorStats') as mongoose.Model<
      INominatorStats & mongoose.Document
    >;

    try {
      await NominatorStats.deleteMany({});
      await NominatorStats.insertMany([
        {
          nomCount: nomCount,
          totalRewards: totalRewards,
          totalAmountStaked: totalAmountStaked,
          nomMinStake: nomMinStake,
        },
      ]);
    } catch (error) {
      Logger.error('Error while updating active nominators stats info', error);
    }

    return;
  },
  updateDB: async function (ActiveNominators, nominatorsInfo, Logger) {
    Object.values(nominatorsInfo).map(async (x) => {
      try {
        await ActiveNominators.findOneAndUpdate(
          { nomId: x.nomId },
          { ...x },
          { upsert: true, useFindAndModify: false },
        );
      } catch (error) {
        Logger.error('error while updating data for nomId: ' + x.nomId);
      }
    });
    return;
  },
  removeInactiveFromDB: async function (ActiveNominators, inactiveNominators, Logger) {
    Logger.info('inactiveNominators');
    Logger.info(inactiveNominators);
    if (inactiveNominators.length > 0) {
      for (let i = 0; i < inactiveNominators.length; i++) {
        const nomId = inactiveNominators[i];
        try {
          await ActiveNominators.deleteMany({ nomId: nomId });
        } catch (error) {
          Logger.error('error while removing inactive nominators', error);
        }
      }
    }

    return;
  },
};
