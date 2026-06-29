/// <reference types="vite/client" />

declare module "lunar-javascript" {
  class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    getLunar(): Lunar;
  }
  class Lunar {
    getYearInChinese(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    toFullString(): string;
  }
  const lunar: {
    Solar: typeof Solar;
    Lunar: typeof Lunar;
  };
  export = lunar;
}
