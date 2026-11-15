import type { BizType } from '../types';
import { bookshop } from './bookshop';
import { clothing } from './clothing';
import type { Template } from './common';
import { cafe, pharmacy, supermarket } from './others';
import { restaurant } from './restaurant';

export const TEMPLATES: Record<BizType, Template> = { clothing, restaurant, bookshop, cafe, pharmacy, supermarket };
export type { Template };
