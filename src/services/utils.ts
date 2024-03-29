import { CustomError } from 'ts-custom-error';
import mongoose from 'mongoose';
import { Container } from 'typedi';

import { IStakingInfo } from '../interfaces/IStakingInfo';
import { IAccountIdentity } from '../interfaces/IAccountIdentity';

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function scaleData(val: number, max: number, min: number): number {
  return ((val - min) / (max - min)) * (100 - 1) + 1;
}

export function normalizeData(val: number, max: number, min: number): number {
  return (val - min) / (max - min);
}

export function sortLowRisk(arr: Array<IStakingInfo>, minRewardPerDay: number): Array<IStakingInfo> {
  const lowestRiskset = arr.filter(
    (x) =>
      x.riskScore < 0.3 &&
      x.commission !== 100 &&
      !x.oversubscribed &&
      !x.blocked &&
      x.rewardsPer100KSM > minRewardPerDay,
  );

  return lowestRiskset;
}

export function sortMedRisk(arr: Array<IStakingInfo>, minRewardPerDay: number): Array<IStakingInfo> {
  const medRiskSet = arr.filter(
    (x) =>
      x.riskScore < 0.5 &&
      x.commission !== 100 &&
      !x.oversubscribed &&
      !x.blocked &&
      x.rewardsPer100KSM > minRewardPerDay,
  );

  // Uncomment below if you want to include include suggestions from other risk-sets

  // const remaining = arr.filter((n) => !medRiskSet.includes(n));
  // const result = medRiskSet.concat(remaining);
  // return result;
  return medRiskSet;
}

export function sortHighRisk(arr: Array<IStakingInfo>, minRewardPerDay: number): Array<IStakingInfo> {
  const highRiskSet = arr.filter(
    (x) => x.commission !== 100 && !x.oversubscribed && !x.blocked && x.rewardsPer100KSM > minRewardPerDay,
  );

  return highRiskSet;
}

export function chunkArray(array: Array<unknown>, size: number): Array<unknown> {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    const chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
}

// Todo save and fetch reused data in a file

// export function jsonReader(filePath, cb) {
//   fs.readFile(filePath, (err, fileData) => {
//     if (err) {
//       return cb && cb(err);
//     }
//     try {
//       const object = JSON.parse(fileData);
//       return cb && cb(null, object);
//     } catch (err) {
//       return cb && cb(err);
//     }
//   });
// }

// export function saveTotalRewardLastIndexInfo(lastIndex: number) {
//   jsonReader('../lastIndexInfo.json', (err, lastIndexInfo) => {
//     if (err) {
//       console.log('Error reading file:', err);
//       return;
//     }
//     // increase customer order count by 1
//     lastIndexInfo.totalRewardLastIndex = lastIndex;
//     fs.writeFile('./lastIndexInfo.json', JSON.stringify(lastIndexInfo), (err) => {
//       if (err) console.log('Error writing file:', err);
//     });
//   });
// }

export class HttpError extends CustomError {
  public constructor(public code: number, message?: string) {
    super(message);
  }
}

export class NoDataFound extends Error {
  public name: string;
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = (this.constructor as any).name;
    this.message = message;
    this.status = status;
    Error.captureStackTrace(this, this.constructor); // after initialize properties
  }
}
