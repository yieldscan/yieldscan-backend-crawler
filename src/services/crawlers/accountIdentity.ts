// @ts-nocheck
import { Container } from 'typedi';
import mongoose from 'mongoose';

import { wait, chunkArray } from '../utils';
import { IAccountIdentity } from '../../interfaces/IAccountIdentity';

module.exports = {
  start: async function (api, networkInfo) {
    const Logger = Container.get('logger');
    Logger.info('start accountIdentity');

    const currentEra = parseInt(await api.query.staking.currentEra());

    const AccountIdentity = Container.get(networkInfo.name + 'AccountIdentity') as mongoose.Model<
      IAccountIdentity & mongoose.Document
    >;

    const lastAvailableEra = await AccountIdentity.find({}).limit(1);

    if (lastAvailableEra.length !== 0) {
      if (currentEra !== lastAvailableEra[0].eraIndex) {
        await module.exports.getAccountsInfo(api, AccountIdentity, currentEra);
      }
    } else {
      await module.exports.getAccountsInfo(api, AccountIdentity, currentEra);
    }

    Logger.info('stop accountIdentity');
    return;
  },

  getAccountsInfo: async function (api, AccountIdentity, currentEra) {
    const Logger = Container.get('logger');
    // get all accountIds
    const getAccountId = (account) =>
      account
        .map((e) => e.args)
        .map(([e]) => e)
        .map((e) => e.toHuman());

    const accountIds = getAccountId(await api.query.system.account.keys());
    // get all account identity info

    const chunkedAccounts = chunkArray(accountIds, 10000);
    // const accountsInfo = [];

    for (let i = 0; i < chunkedAccounts.length; i++) {
      const info = await Promise.all(
        chunkedAccounts[i].map(async (x) => {
          const info = await api.derive.accounts.info(x);
          // const display = info.identity.display !== undefined ? info.identity.display.toString() : null;
          // const email = info.identity.email !== undefined ? info.identity.email.toString() : null;
          // const legal = info.identity.legal !== undefined ? info.identity.legal.toString() : null;
          // const riot = info.identity.riot !== undefined ? info.identity.riot.toString() : null;
          // const web = info.identity.web !== undefined ? info.identity.web.toString() : null;
          // const twitter = info.identity.twitter !== undefined ? info.identity.twitter.toString() : null;
          return {
            stashId: x,
            accountId: x,
            display: info?.identity?.display?.toString(),
            displayParent: info?.identity?.displayParent?.toString(),
            parent: info?.identity?.parent?.toString(),
            email: info?.identity?.email?.toString(),
            eraIndex: currentEra,
            legal: info?.identity?.legal?.toString(),
            riot: info?.identity?.riot?.toString(),
            twitter: info?.identity?.twitter?.toString(),
            web: info?.identity?.web?.toString(),
          };
        }),
      );
      // accountsInfo.push(...info);

      info.map(async (accountInfo: IAccountIdentity) => {
        try {
          await AccountIdentity.findOneAndUpdate(
            { accountId: accountInfo.accountId },
            { ...accountInfo },
            { upsert: true, useFindAndModify: false },
          );
        } catch (error) {
          Logger.error('error while updating data for nomId: ' + accountInfo.accountId, error);
        }
      });
    }

    Logger.info('Waiting 5s');
    await wait(5000);

    // update info

    // todo replace delete insert logic with a more suitable process like update/updateMany
    // try {
    //   await AccountIdentity.deleteMany({});
    //   await AccountIdentity.insertMany(accountsInfo);
    // } catch (error) {
    //   Logger.error('Error while updating accountIdentities', error);
    // }
    return;
  },
};
