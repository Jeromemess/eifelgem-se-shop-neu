
import { Product } from '../types';

/** Berechnet den Endpreis für eine Menge unter Berücksichtigung von Rabatt und BOGO */
export const calcLineTotal = (product: Product, paidQty: number): number => {
  const discounted = product.pricePerUnit * (1 - (product.discount || 0) / 100);
  return discounted * paidQty;
};

/** Einzelpreis nach Rabatt */
export const calcUnitPrice = (product: Product): number =>
  product.pricePerUnit * (1 - (product.discount || 0) / 100);
