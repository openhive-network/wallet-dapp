import type { ApiAccount, IManabarData } from '@hiveio/wax/vite';
import { defineStore } from 'pinia';
import { getWax } from '@/stores/wax.store';

const PERCENT_VALUE_DOUBLE_PRECISION = 100;
const ONE_HUNDRED_PERCENT = BigInt(100) * BigInt(PERCENT_VALUE_DOUBLE_PRECISION);

export class BalanceData {
  public readonly usdValue: number;
  public readonly usdString: string;
  public readonly stringValue: string;

  public constructor(public readonly amount: bigint, public readonly precision: number, usdPrice: number) {
    this.stringValue = BalanceData.stringifyWithPrecision(this.amount, this.precision);

    // We use the precision instead of USD price precision to avoid floating point issues
    const usdValue = this.amount * BigInt(Math.floor(usdPrice * (10 ** this.precision)));
    const usdPrecisionMultiplier = 10 ** this.precision;
    const [integerPart, fractionalPart] = BalanceData.stringifyWithPrecisionTuple(usdValue / BigInt(usdPrecisionMultiplier), this.precision);
    this.usdString = `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fractionalPart.slice(0, 2)}`;
    this.usdValue = Number(integerPart) + Number(fractionalPart) / (10 ** this.precision);
  }

  private static stringifyWithPrecisionTuple(value: bigint, precision: number): [string, string] {
    const baseValue = value.toString();
    const integerPart = baseValue.slice(0, -precision) || '0';
    const fractionalPart = baseValue.slice(-precision).padStart(precision, '0');
    return [integerPart, fractionalPart];
  }

  public static stringifyWithPrecision(value: bigint, precision: number): string {
    const [integerPart, fractionalPart] = BalanceData.stringifyWithPrecisionTuple(value, precision);
    return `${integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fractionalPart}`;
  }

  public toString(): string {
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
    userData: undefined as undefined | ApiAccount,
    manabars: undefined as undefined | Manabars
  }),
  getters: {
    profileImage: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.profile_image || ctx.parsedJsonMetadata?.profile?.profile_image : undefined,
    name: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.name || ctx.userData?.name : undefined,
    about: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.about || ctx.parsedJsonMetadata?.profile?.about : undefined,
    website: (ctx): undefined | string => ctx.isReady ? ctx.parsedPostingJsonMetadata?.profile?.website || ctx.parsedJsonMetadata?.profile?.website : undefined
  },
  actions: {
    // Used for logout
    resetSettings () {
      this.isReady = false;
      this.parsedPostingJsonMetadata = undefined;
      this.userData = undefined;
      this.balances = undefined;
      this.manabars = undefined;
    },
    async parseUserBalances (data: ApiAccount) {
      try {
        const wax = await getWax();
        const { total_vesting_fund_hive, total_vesting_shares, downvote_pool_percent, time } = await wax.api.database_api.get_dynamic_global_properties({});
        const { base, quote } = await wax.api.database_api.get_current_price_feed({});
        const hivePrice = Number(base.amount) / Number(quote.amount);
        const vestsToHp = (data: bigint) => BigInt(wax.vestsToHp(data, total_vesting_fund_hive, total_vesting_shares).amount);
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
            unclaimed: new BalanceData(BigInt(data.reward_hbd_balance.amount), data.reward_hbd_balance.precision, 1),
          },
          HIVE: {
            liquid: new BalanceData(BigInt(data.balance.amount), data.balance.precision, hivePrice),
            savings: new BalanceData(BigInt(data.savings_balance.amount), data.savings_balance.precision, hivePrice),
            unclaimed: new BalanceData(BigInt(data.reward_hive_balance.amount), data.reward_hive_balance.precision, hivePrice),
          },
        };

        // Maybe adjust wax code so I don't have to do all of this manually:
        // (Currently I do this so wax does not call API multiple times for same data)
        const { rc_accounts: [rcData] } = await wax.api.rc_api.find_rc_accounts({ accounts: [data.name] });
        const now = Math.floor(new Date(`${time}Z`).getTime() / 1000);
        const downvotePoolPercent = BigInt(downvote_pool_percent);
        let downVoteManabarMax = BigInt(data.post_voting_power.amount);
        if(downVoteManabarMax / ONE_HUNDRED_PERCENT > ONE_HUNDRED_PERCENT)
          downVoteManabarMax = (downVoteManabarMax / ONE_HUNDRED_PERCENT) * downvotePoolPercent;
        else
          downVoteManabarMax = (downVoteManabarMax * downvotePoolPercent) / ONE_HUNDRED_PERCENT;

        this.manabars = {
          upvote: wax.calculateCurrentManabarValue(now, data.post_voting_power.amount, data.voting_manabar.current_mana, data.voting_manabar.last_update_time),
          downvote: wax.calculateCurrentManabarValue(now, data.post_voting_power.amount, data.downvote_manabar.current_mana, data.downvote_manabar.last_update_time),
          rc: wax.calculateCurrentManabarValue(now, rcData.max_rc, rcData.rc_manabar.current_mana, rcData.rc_manabar.last_update_time)
        };
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    },
    setUserData (data: ApiAccount) {
      this.userData = data;
      try {
        this.parsedJsonMetadata = JSON.parse(data.json_metadata);
        this.parsedPostingJsonMetadata = JSON.parse(data.posting_json_metadata);
      } catch {}
      this.parseUserBalances(data).finally(() => {
        this.isReady = true;
      });
    }
  }
});
