import type { ApiAccount, IManabarData } from '@hiveio/wax/vite';
import { defineStore } from 'pinia';

import { getWax } from '@/stores/wax.store';
import { lessThanDate } from '@/utils/parse-date';
import { parseReputation } from '@/utils/parse-reputation';

const PERCENT_VALUE_DOUBLE_PRECISION = 100;
const ONE_HUNDRED_PERCENT = BigInt(100) * BigInt(PERCENT_VALUE_DOUBLE_PRECISION);

export const transformUserName = (name: string): string => {
  if (name.startsWith('STM'))
    return name.slice(0, 15) + '...';

  if (name.startsWith('@'))
    name = name.slice(1);

  if (name.length > 15)
    return `@${name.slice(0, 15)}...`;

  return `@${name}`;
};

export class BalanceData {
  public readonly usdValue: number;
  public readonly usdString: string;
  public readonly stringValue: string;

  public constructor (public readonly amount: bigint, public readonly precision: number, usdPrice: number) {
    this.stringValue = BalanceData.stringifyWithPrecision(this.amount, this.precision);

    // We use the precision instead of USD price precision to avoid floating point issues
    const usdValue = this.amount * BigInt(Math.floor(usdPrice * (10 ** this.precision)));
    const usdPrecisionMultiplier = 10 ** this.precision;
    const [integerPart, fractionalPart] = BalanceData.stringifyWithPrecisionTuple(usdValue / BigInt(usdPrecisionMultiplier), this.precision);
    this.usdString = `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fractionalPart.slice(0, 2)}`;
    this.usdValue = Number(integerPart) + Number(fractionalPart) / (10 ** this.precision);
  }

  private static stringifyWithPrecisionTuple (value: bigint, precision: number): [string, string] {
    const baseValue = value.toString();
    const integerPart = baseValue.slice(0, -precision) || '0';
    const fractionalPart = baseValue.slice(-precision).padStart(precision, '0');
    return [integerPart, fractionalPart];
  }

  public static stringifyWithPrecision (value: bigint, precision: number): string {
    const [integerPart, fractionalPart] = BalanceData.stringifyWithPrecisionTuple(value, precision);
    return `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fractionalPart}`;
  }

  public toString (): string {
    return this.stringValue;
  }
}

interface JsonMetadata {
  profile?: {
    profile_image?: string;
    name?: string;
    about?: string;
    website?: string;
  };
}

interface AssetBalances {
  HP: {
    owned: BalanceData;
    received: BalanceData;
    delegated: BalanceData;
    unclaimed: BalanceData;
    poweringDown: BalanceData;
  };
  HIVE: {
    liquid: BalanceData;
    savings: BalanceData;
    unclaimed: BalanceData;
  };
  HBD: {
    liquid: BalanceData;
    savings: BalanceData;
    unclaimed: BalanceData;
  };
}

interface Manabars {
  upvote: IManabarData;
  downvote: IManabarData;
  rc: IManabarData;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    isReady: false,
    parsedPostingJsonMetadata: undefined as undefined | JsonMetadata,
    parsedJsonMetadata: undefined as undefined | JsonMetadata,
    balances: undefined as undefined | AssetBalances,
    manabars: undefined as undefined | Manabars,
    userDisplayName: undefined as undefined | string
  }),
  getters: {
    profileImage: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.profile_image || ctx.parsedJsonMetadata?.profile?.profile_image : undefined,
    name: (ctx): undefined | string => ctx.isReady ? transformUserName(ctx.parsedPostingJsonMetadata?.profile?.name || ctx.parsedJsonMetadata?.profile?.name || ctx.userDisplayName as string) : undefined,
    about: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.about || ctx.parsedJsonMetadata?.profile?.about : undefined,
    website: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.website || ctx.parsedJsonMetadata?.profile?.website : undefined
  },
  actions: {
    // Used for logout
    resetSettings () {
      this.isReady = false;
      this.parsedPostingJsonMetadata = undefined;
      this.balances = undefined;
      this.manabars = undefined;
      this.userDisplayName = undefined;
    },
    async getHivePrice () {
      const wax = await getWax();

      const { base, quote } = await wax.api.database_api.get_current_price_feed({});
      const hivePrice = Number(base.amount) / Number(quote.amount);

      return hivePrice;
    },
    async parseUserBalances (data: ApiAccount) {
      try {
        const wax = await getWax();
        const { total_vesting_fund_hive, total_vesting_shares, downvote_pool_percent, time } = await wax.api.database_api.get_dynamic_global_properties({});
        const vestsToHp = (data: bigint) => BigInt(wax.vestsToHp(data, total_vesting_fund_hive, total_vesting_shares).amount);
        const hivePrice = await this.getHivePrice();
        this.balances = {
          HP: {
            owned: new BalanceData(vestsToHp(BigInt(data.vesting_shares.amount) - BigInt(data.delegated_vesting_shares.amount)), data.balance.precision, hivePrice),
            received: new BalanceData(vestsToHp(BigInt(data.received_vesting_shares.amount)), data.balance.precision, hivePrice),
            delegated: new BalanceData(vestsToHp(BigInt(data.delegated_vesting_shares.amount)), data.balance.precision, hivePrice),
            unclaimed: new BalanceData(BigInt(data.reward_vesting_hive.amount), data.balance.precision, hivePrice),
            poweringDown: new BalanceData(vestsToHp(BigInt(data.vesting_withdraw_rate.amount) * BigInt(new Date(data.next_vesting_withdrawal).getTime() - Date.now()) / BigInt(60 * 60 * 24 * 7 * 52)), data.balance.precision, hivePrice)
          },
          HBD: {
            liquid: new BalanceData(BigInt(data.hbd_balance.amount), data.hbd_balance.precision, 1),
            savings: new BalanceData(BigInt(data.savings_hbd_balance.amount), data.savings_hbd_balance.precision, 1),
            unclaimed: new BalanceData(BigInt(data.reward_hbd_balance.amount), data.reward_hbd_balance.precision, 1)
          },
          HIVE: {
            liquid: new BalanceData(BigInt(data.balance.amount), data.balance.precision, hivePrice),
            savings: new BalanceData(BigInt(data.savings_balance.amount), data.savings_balance.precision, hivePrice),
            unclaimed: new BalanceData(BigInt(data.reward_hive_balance.amount), data.reward_hive_balance.precision, hivePrice)
          }
        };

        // Maybe adjust wax code so I don't have to do all of this manually:
        // (Currently I do this so wax does not call API multiple times for same data)
        const { rc_accounts: [rcData] } = await wax.api.rc_api.find_rc_accounts({ accounts: [data.name] });
        if (!rcData)
          throw new Error('RC data not found for account');

        const now = Math.floor(new Date(`${time}Z`).getTime() / 1000);
        const downvotePoolPercent = BigInt(downvote_pool_percent);
        let downVoteManabarMax = BigInt(data.post_voting_power.amount);
        if(downVoteManabarMax / ONE_HUNDRED_PERCENT > ONE_HUNDRED_PERCENT)
          downVoteManabarMax = (downVoteManabarMax / ONE_HUNDRED_PERCENT) * downvotePoolPercent;
        else
          downVoteManabarMax = (downVoteManabarMax * downvotePoolPercent) / ONE_HUNDRED_PERCENT;

        this.manabars = {
          upvote: wax.calculateCurrentManabarValue(now, data.post_voting_power.amount, data.voting_manabar.current_mana, data.voting_manabar.last_update_time),
          downvote: wax.calculateCurrentManabarValue(now, downVoteManabarMax, data.downvote_manabar.current_mana, data.downvote_manabar.last_update_time),
          rc: wax.calculateCurrentManabarValue(now, rcData.max_rc, rcData.rc_manabar.current_mana, rcData.rc_manabar.last_update_time)
        };
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    },
    async parseCTokenData (accountName: string) {
      const wax = await getWax();

      const [ user ] = await wax.restApi.ctokensApi.registeredUsers({ user: accountName });

      if (!user)
        throw new Error('CTokens user not found');


      const hivePrice = await this.getHivePrice();

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const metadata = user.metadata as Record<string, any>;

      this.parsedJsonMetadata = {
        profile: {
          about: metadata?.about,
          name: metadata?.name,
          profile_image: metadata?.profile_image,
          website: metadata?.website
        }
      };
      this.balances = {
        HBD: {
          liquid: new BalanceData(0n, wax.ASSETS.HBD.precision, 1),
          savings: new BalanceData(0n, wax.ASSETS.HBD.precision, 1),
          unclaimed: new BalanceData(0n, wax.ASSETS.HBD.precision, 1)
        },
        HIVE: {
          liquid: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice),
          savings: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice),
          unclaimed: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice)
        },
        HP: {
          poweringDown: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice),
          unclaimed: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice),
          owned: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice),
          received: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice),
          delegated: new BalanceData(0n, wax.ASSETS.HIVE.precision, hivePrice)
        }
      };
      this.manabars = {
        downvote: {
          current: 0n, max: 0n, percent: 0
        },
        rc: {
          current: 0n, max: 0n, percent: 0
        },
        upvote: {
          current: 0n, max: 0n, percent: 0
        }
      };
    },
    async parseUserData (accountName: string) {
      this.userDisplayName = transformUserName(accountName);

      if (accountName.startsWith('STM'))
        await this.parseCTokenData(accountName);
      else
        await this.parseOnChainUserData(accountName);

      this.isReady = true;
    },
    async parseOnChainUserData (accountName: string) {
      const wax = await getWax();

      const { accounts: [ data ] } = await wax.api.database_api.find_accounts({ accounts: [ accountName ], delayed_votes_active: false });
      if (!data)
        throw new Error('Account not found');

      try {
        this.parsedJsonMetadata = JSON.parse(data.json_metadata);
      } catch {}
      try {
        this.parsedPostingJsonMetadata = JSON.parse(data.posting_json_metadata);
      } catch {}

      await this.parseUserBalances(data);
    },
    async getAccountMetadata (accountName: string) {
      const wax = await getWax();

      const {
        created,
        reputation,
        metadata: {
          profile: {
            about,
            name,
            profile_image,
            website
          }
        }
      } = await wax.api.bridge.get_profile({account: accountName});

      const createdAt = new Date(created + 'Z'); // Adding 'Z' to indicate UTC time

      return {
        profileImage: profile_image,
        displayName: name,
        accountName,
        about,
        website,
        createdAt,
        createdAgo: lessThanDate(createdAt),
        reputationScore: reputation,
        reputation: parseReputation(reputation)
      };
    }
  }
});
