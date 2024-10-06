import { JupiterTokenListToken } from "./JupiterTokenList";
import PairGroupProfits from "./PairGroupProfits";
import { summarize } from "./util";

export interface CumulativeProfitDataPoint {
  "Close/Claim Date": number;
  "Cumulative Profit": number;
  "Cumulative Profit in USD": number;
}

export interface TokenProfitDataPoint {
  Symbol: string;
  Fees: number;
  "Fees in USD": null | number;
  "Rewards in USD": null | number;
  "Impermanent Loss": number;
  "Impermanent Loss in USD": null | number;
  "Total Profit": number;
  "Total Profit in USD": null | number;
}

export default class QuoteTokenProfit {
  quoteToken: JupiterTokenListToken;
  pairGroupProfits: PairGroupProfits[];
  pairGroupCount!: number;
  positionCount!: number;
  positionCountWithApiErrors!: number;
  transactionCount!: number;
  totalDeposits!: number;
  profitPercent: number;
  totalProfit!: number;
  profitMissingApiData!: number;
  usdProfitPercent: null | number = null;
  usdTotalProfit: null | number = null;
  totalFees!: number;
  feesMissingApiData!: number;
  usdTotalDeposits: null | number = null;
  usdTotalFees: null | number = null;
  usdTotalRewards: null | number = null;
  divergenceLoss: number;
  usdDivergenceLoss: null | number = null;
  cumulativeProfit: CumulativeProfitDataPoint[] = [];
  tokenProfit: TokenProfitDataPoint[];

  constructor(pairGroupProfits: PairGroupProfits[]) {
    this.quoteToken = pairGroupProfits[0].quoteToken;
    this.pairGroupProfits = pairGroupProfits.sort(
      (a, b) => b.totalProfit - a.totalProfit,
    );

    summarize(
      pairGroupProfits,
      {
        pairGroupCount: {
          summaryMethod: "count",
        },
        positionCount: {
          summaryMethod: "sum",
          key: "positionCount",
        },
        positionCountWithApiErrors: {
          summaryMethod: "sum",
          key: "positionCountWithApiErrors",
        },
        transactionCount: {
          summaryMethod: "sum",
          key: "transactionCount",
        },
        totalDeposits: {
          summaryMethod: "sum",
          key: "totalDeposits",
        },
        totalProfit: {
          summaryMethod: "sum",
          key: "totalProfit",
          postProcess: (value) =>
            Math.floor(value * 10 ** this.quoteToken.decimals) /
            10 ** this.quoteToken.decimals,
        },
        profitMissingApiData: {
          summaryMethod: "sum",
          key: "profitMissingApiData",
          postProcess: (value) =>
            Math.floor(value * 10 ** this.quoteToken.decimals) /
            10 ** this.quoteToken.decimals,
        },
        totalFees: {
          summaryMethod: "sum",
          key: "totalFees",
          postProcess: (value) =>
            Math.floor(value * 10 ** this.quoteToken.decimals) /
            10 ** this.quoteToken.decimals,
        },
        feesMissingApiData: {
          summaryMethod: "sum",
          key: "feesMissingApiData",
          postProcess: (value) =>
            Math.floor(value * 10 ** this.quoteToken.decimals) /
            10 ** this.quoteToken.decimals,
        },
        usdTotalDeposits: {
          summaryMethod: "sum",
          key: "usdTotalDeposits",
        },
        usdTotalProfit: {
          summaryMethod: "sum",
          key: "usdTotalProfit",
        },
        usdTotalFees: {
          summaryMethod: "sum",
          key: "usdTotalFees",
        },
        usdTotalRewards: {
          summaryMethod: "sum",
          key: "usdTotalRewards",
        },
      },
      this,
    );

    this.divergenceLoss =
      Math.floor(
        (this.totalProfit - this.totalFees) * 10 ** this.quoteToken.decimals,
      ) /
      10 ** this.quoteToken.decimals;
    this.usdDivergenceLoss =
      this.usdTotalProfit! - this.usdTotalFees! - this.usdTotalRewards!;
    this.profitPercent = -this.totalProfit / this.totalDeposits;
    this.usdProfitPercent =
      this.usdTotalProfit && this.usdTotalDeposits
        ? -this.usdTotalProfit / this.usdTotalDeposits
        : null;

    const positions = pairGroupProfits
      .map((pairGroupSummary) => pairGroupSummary.positions)
      .flat()
      .sort((a, b) => a.closeTimestampMs - b.closeTimestampMs);

    positions.forEach((position, index) => {
      if (index == 0) {
        this.cumulativeProfit.push({
          "Close/Claim Date": position.closeTimestampMs,
          "Cumulative Profit": position.profitLossValue,
          "Cumulative Profit in USD": Number(position.usdProfitLossValue),
        });
      } else {
        this.cumulativeProfit.push({
          "Close/Claim Date": position.closeTimestampMs,
          "Cumulative Profit":
            Math.floor(
              (this.cumulativeProfit[index - 1]["Cumulative Profit"] +
                position.profitLossValue) *
                10 ** this.quoteToken.decimals,
            ) /
            10 ** this.quoteToken.decimals,
          "Cumulative Profit in USD":
            this.cumulativeProfit[index - 1]["Cumulative Profit in USD"] +
            Number(position.usdProfitLossValue),
        });
      }
    });

    this.tokenProfit = this.pairGroupProfits.map((pairGroup) => {
      return {
        Symbol: pairGroup.baseToken.symbol,
        "Quote Symbol": pairGroup.quoteToken.symbol,
        Fees: pairGroup.totalFees,
        "Fees in USD": pairGroup.usdTotalFees,
        "Rewards in USD": pairGroup.usdTotalRewards,
        "Impermanent Loss": pairGroup.divergenceLoss,
        "Total Deposits": pairGroup.totalDeposits,
        "Impermanent Loss in USD": pairGroup.usdDivergenceLoss,
        "Total Deposits in USD": pairGroup.usdTotalDeposits,
        "Total Profit": pairGroup.totalProfit,
        "Total Profit Percent": pairGroup.profitPercent,
        "Total Profit in USD": pairGroup.usdTotalProfit,
        "USD Total Profit Percent": pairGroup.usdProfitPercent,
      };
    });
  }
}
