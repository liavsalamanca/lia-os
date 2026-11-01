export const USD_THRESHOLD = 200;

export type QuoteInput = {
  priceUSD: number;
  shippingUSD: number;
  weightLb: number;
  /** Sin valor usa la tarifa de configuración. Un 0 explícito se respeta. */
  shippingRate?: number;
  extraUSD: number;
  /** Sin valor, o sin ser positiva, usa la tasa de configuración. */
  fx?: number;
  marginPercent: number;
};

export type QuoteDefaults = { shippingRate: number; fx: number };

export type Quote = {
  totalUSD: number;
  costCOP: number;
  sellCOP: number;
  profitCOP: number;
  overThreshold: boolean;
};

/** Costo = producto + envío USA + casillero por libra + extras. Venta redondeada hacia arriba a 100 COP. */
export function calculateQuote(input: QuoteInput, defaults: QuoteDefaults): Quote {
  const rate = input.shippingRate ?? defaults.shippingRate;
  const fx = input.fx && input.fx > 0 ? input.fx : defaults.fx;
  const totalUSD = input.priceUSD + input.shippingUSD + input.weightLb * rate + input.extraUSD;
  const costCOP = totalUSD * fx;
  const sellCOP = Math.ceil((costCOP * (1 + input.marginPercent / 100)) / 100) * 100;
  return {
    totalUSD,
    costCOP,
    sellCOP,
    profitCOP: sellCOP - costCOP,
    overThreshold: input.priceUSD + input.shippingUSD > USD_THRESHOLD,
  };
}
