// Shared types of the simulation engine. Nothing here touches the DOM: the engine runs in a worker and in tests.

export type BizType = 'clothing' | 'restaurant' | 'bookshop' | 'cafe' | 'pharmacy' | 'supermarket';
export const BIZ_TYPES: BizType[] = ['clothing', 'restaurant', 'bookshop', 'cafe', 'pharmacy', 'supermarket'];
export type Lang = 'en' | 'es';

/** The big parameters: chosen in the wizard, fixed afterwards. */
export interface BigParams {
  type: BizType;
  name: string;
  sizeM2: number;
  locationTier: 1 | 2 | 3;       // 1 neighbourhood, 2 high street, 3 prime
  pricePos: 0 | 1 | 2;           // low, mid, premium
  openHour: number;              // 0-23
  closeHour: number;             // 1-24, > openHour
  closedDay: number;             // -1 none, otherwise weekday 0 = Monday ... 6 = Sunday
  investment: number;            // euros
  staff: number;                 // head count at opening
  online: boolean;
  historyDays: number;           // days generated at creation
  startDate: string;             // ISO date of day 0
  seed: number;
  lang: Lang;                    // language of product and category names in the data
}

/** The small parameters: sliders that can move any day. */
export interface SmallParams {
  traffic: number;        // visitors on a normal day
  items: number;          // products on sale
  priceLevel: number;     // % against the opening price list
  promoDepth: number;     // % off on promoted products
  promoShare: number;     // % of the catalogue on promotion
  marketing: number;      // euros per month
  staffPerShift: number;
  reorderDays: number;    // days of demand kept as safety stock
  supplierCost: number;   // % against the opening cost list
  quality: number;        // 1-5
}
export type SmallKey = keyof SmallParams;
export const SMALL_KEYS: SmallKey[] = ['traffic', 'items', 'priceLevel', 'promoDepth', 'promoShare', 'marketing', 'staffPerShift', 'reorderDays', 'supplierCost', 'quality'];

/** One logged change. `param` is a SmallKey or `price:<productId>`. It takes effect at the start of `day`. */
export interface Change { id: string; day: number; param: string; old: number; value: number; }

/** Everything needed to rebuild a business on any device: this is what is saved and synced. */
export interface Recipe {
  id: string;
  big: BigParams;
  small0: SmallParams;
  changes: Change[];
  day: number;            // days simulated so far (history + live)
  dirty: boolean;         // dirty-data switch for the table view and exports
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
  snap?: Snapshot;        // last known headline numbers, for the portfolio before the simulation is loaded
}
export interface Snapshot { rev30: number; margin30: number; profit30: number; tx30: number; spark: number[]; day: number; }

export interface Filters { from: number; to: number; category: number; channel: -1 | 0 | 1; }
