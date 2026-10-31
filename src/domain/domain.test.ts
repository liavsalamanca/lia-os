import { describe, expect, it } from 'vitest';
import type { Transaction } from '../data/schema';
import { formatLongDate, monthGrid, shiftDays, todayISO } from './dates';
import { clampPercent, goalPercent, monthSummary } from './finance';
import { streak, toggleHabitDate } from './habits';
import { calculateQuote } from './quote';
import { safeUrl } from './url';

const defaults = { shippingRate: 5, fx: 4000 };
const order = { priceUSD: 100, shippingUSD: 10, weightLb: 2, extraUSD: 5, marginPercent: 15 };

/** Fórmula exacta de assets/app.js en v1, para comprobar que el cálculo no cambió. */
function v1Quote(o: typeof order & { shippingRate: number; fx: number }) {
  const totalUSD = o.priceUSD + o.shippingUSD + o.weightLb * o.shippingRate + o.extraUSD;
  const costCOP = totalUSD * o.fx;
  const sellCOP = Math.ceil((costCOP * (1 + o.marginPercent / 100)) / 100) * 100;
  return { totalUSD, costCOP, sellCOP, profit: sellCOP - costCOP };
}

describe('calculateQuote', () => {
  it('suma producto, envío, casillero y extras', () => {
    expect(calculateQuote({ ...order, shippingRate: 5, fx: 4000 }, defaults)).toEqual({
      totalUSD: 125,
      costCOP: 500000,
      sellCOP: 575000,
      profitCOP: 75000,
      overThreshold: false,
    });
  });

  it('calcula el peso fraccionario de forma proporcional', () => {
    expect(calculateQuote({ ...order, weightLb: 0.3, extraUSD: 0, shippingRate: 5, fx: 4000 }, defaults).totalUSD).toBeCloseTo(111.5);
  });

  it.each([
    { priceUSD: 80, shippingUSD: 7.5, weightLb: 1.25, extraUSD: 3, marginPercent: 20, shippingRate: 5, fx: 3987 },
    { priceUSD: 199.99, shippingUSD: 0, weightLb: 0.3, extraUSD: 0, marginPercent: 12.5, shippingRate: 4.5, fx: 4215.5 },
    { priceUSD: 12, shippingUSD: 3, weightLb: 7, extraUSD: 1.2, marginPercent: 0, shippingRate: 5, fx: 4100 },
  ])('coincide con la fórmula de v1: %o', (input) => {
    const expected = v1Quote(input);
    const quote = calculateQuote(input, defaults);
    expect(quote.sellCOP).toBe(expected.sellCOP);
    expect(quote.profitCOP).toBeCloseTo(expected.profit);
  });

  it('usa los valores predeterminados si faltan', () => {
    expect(calculateQuote(order, defaults).totalUSD).toBe(125);
  });

  it('respeta un casillero de 0 (en v1 aplicaba la tarifa predeterminada)', () => {
    expect(calculateQuote({ ...order, shippingRate: 0, fx: 4000 }, defaults).totalUSD).toBe(115);
  });

  it('no permite una tasa de cambio de 0', () => {
    expect(calculateQuote({ ...order, fx: 0 }, defaults).costCOP).toBe(500000);
  });

  it('avisa solo al superar USD 200 en producto más envío', () => {
    expect(calculateQuote({ ...order, priceUSD: 190, shippingUSD: 10 }, defaults).overThreshold).toBe(false);
    expect(calculateQuote({ ...order, priceUSD: 190.01, shippingUSD: 10 }, defaults).overThreshold).toBe(true);
  });
});

describe('fechas', () => {
  it('usa la fecha de Colombia aunque en UTC ya sea el día siguiente', () => {
    expect(todayISO('America/Bogota', new Date('2026-03-02T03:00:00Z'))).toBe('2026-03-01');
    expect(todayISO('UTC', new Date('2026-03-02T03:00:00Z'))).toBe('2026-03-02');
  });

  it('desplaza días cruzando meses y años', () => {
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDays('2024-02-28', 1)).toBe('2024-02-29');
  });

  it('formatea sin saltar de día', () => {
    expect(formatLongDate('2026-03-01')).toContain('1 de marzo');
  });

  it('la cuadrícula del mes empieza en lunes y completa semanas', () => {
    const grid = monthGrid(2026, 1);
    expect(grid[0]?.date).toBe('2026-01-26');
    expect(grid.length % 7).toBe(0);
    expect(grid.filter((c) => c.inMonth)).toHaveLength(28);
  });

  it('la cuadrícula funciona con meses fuera de rango', () => {
    expect(monthGrid(2026, 12).find((c) => c.inMonth)?.date).toBe('2027-01-01');
    expect(monthGrid(2026, -1).find((c) => c.inMonth)?.date).toBe('2025-12-01');
  });
});

describe('hábitos', () => {
  const logs = { h: ['2026-01-01', '2026-01-02', '2026-01-03'] };

  it('cuenta días seguidos', () => {
    expect(streak(logs, 'h', '2026-01-03')).toBe(3);
  });

  it('no rompe la racha si hoy aún no se marca', () => {
    expect(streak(logs, 'h', '2026-01-04')).toBe(3);
  });

  it('se rompe tras un día sin marcar', () => {
    expect(streak(logs, 'h', '2026-01-05')).toBe(0);
  });

  it('marca y desmarca sin alterar el objeto original', () => {
    const on = toggleHabitDate({}, 'h', '2026-01-01');
    expect(on.h).toEqual(['2026-01-01']);
    expect(toggleHabitDate(on, 'h', '2026-01-01').h).toEqual([]);
    expect(on.h).toEqual(['2026-01-01']);
  });
});

describe('finanzas', () => {
  const tx = (kind: string, amount: number, date: string) => ({ kind, amount, date }) as Transaction;

  it('resume solo el mes pedido', () => {
    const summary = monthSummary([tx('Ingreso', 1000, '2026-01-05'), tx('Gasto', 300, '2026-01-09'), tx('Gasto', 999, '2026-02-01')], '2026-01');
    expect(summary).toMatchObject({ income: 1000, expenses: 300, balance: 700 });
  });

  it('limita los porcentajes', () => {
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-4)).toBe(0);
    expect(goalPercent(50, 0)).toBe(100);
    expect(goalPercent(25, 100)).toBe(25);
  });
});

describe('safeUrl', () => {
  it('permite http y https', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
  });

  it.each(['javascript:alert(1)', 'data:text/html,hola', 'no es url', ''])('bloquea %s', (value) => {
    expect(safeUrl(value)).toBeNull();
  });
});
