import mongoose from 'mongoose';
import { Container } from 'typedi';

import { IStakingInfo } from '../../interfaces/IStakingInfo';
import { ITotalRewardHistory } from '../../interfaces/ITotalRewardHistory';
import { INominatorHistory } from '../../interfaces/INominatorHistory';
import { IActiveNominators } from '../../interfaces/IActiveNominators';
import { wait } from '../utils';

module.exports = {
  start: async function (api, networkName) {
    const Logger = Container.get('logger');
    Logger.info('start activeNominators');
    const Validators = Container.get(networkName + 'Validators') as mongoose.Model<IStakingInfo & mongoose.Document>;
    const validators = await Validators.find({});

    // console.log(JSON.stringify(validators, null, 2));

    const nominatorsInfo = await module.exports.getNominatorsInfo(validators);

    Logger.info('waiting 5 secs');
    await wait(5000);

    // console.log(JSON.stringify(nominatorsInfo, null, 2));

    await module.exports.getDailyEarnings(nominatorsInfo, networkName);

    Logger.info('stop activeNominators');
    return;
  },

  getNominatorsInfo: async function (validators) {
    const result = [];
    validators.map((x) => {
      const estimatedPoolReward = x.estimatedPoolReward;
      const riskScore = x.riskScore;
      x.nominators.map((y) => {
        if (result.some((element) => element.nomId == y.nomId)) {
          result.map((z) => {
            if (z.nomId == y.nomId) {
              z.validatorsInfo.push({
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
        } else {
          result.push({
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
          });
        }
      });
    });
    return result;
  },
  getDailyEarnings: async function (nominatorsInfo, networkName) {
    const Logger = Container.get('logger');
    const TotalRewardHistory = Container.get(networkName + 'TotalRewardHistory') as mongoose.Model<
      ITotalRewardHistory & mongoose.Document
    >;
    const lastIndexDB = await TotalRewardHistory.find({}).sort({ eraIndex: -1 }).limit(4);
    const NominatorHistory = Container.get(networkName + 'NominatorHistory') as mongoose.Model<
      INominatorHistory & mongoose.Document
    >;
    const eraIndexArr = lastIndexDB.map((x) => x.eraIndex);
    const decimalPlaces = networkName == 'kusama' ? 12 : 10;
    const previous4ErasData = await NominatorHistory.find({ eraIndex: { $in: eraIndexArr } });
    nominatorsInfo.map((x) => {
      const individualHistory = previous4ErasData.filter((y) => y.nomId == x.nomId);
      const earnings = individualHistory.map((y) => {
        const totalReward = lastIndexDB.filter((z) => z.eraIndex == y.eraIndex);
        const result = y.validatorsInfo.reduce((a, b) => {
          const commission = b.commission / Math.pow(10, 9);
          const totalStake = b.totalStake / Math.pow(10, decimalPlaces);
          const nomStake = b.nomStake / Math.pow(10, decimalPlaces);
          const poolReward = ((totalReward[0].eraTotalReward / Math.pow(10, decimalPlaces)) * b.eraPoints) / b.totalEraPoints;
          const reward = (poolReward - commission * poolReward) * (nomStake / totalStake);
          return a + reward;
        }, 0);
        return result;
      });
      x.dailyEarnings = earnings.reduce((a, b) => a + b, 0);
    });
    const ActiveNominators = Container.get(networkName + 'ActiveNominators') as mongoose.Model<
      IActiveNominators & mongoose.Document
    >;

    try {
      await ActiveNominators.deleteMany({});
      await ActiveNominators.insertMany(nominatorsInfo);
    } catch (error) {
      Logger.error('Error while updating active nominators info', error);
    }

    return;
    // const lastIndex = lastIndexDB[0].eraIndex;
  },
};
