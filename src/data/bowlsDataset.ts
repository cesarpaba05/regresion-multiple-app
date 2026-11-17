import { DataRow } from '../types/analytics';
import { createNormalSampler, createSeededRng } from '../stats/prng';

/**
 * Generates the preloaded synthetic dataset:
 * 186 days of a shopping-mall bowl restaurant.
 * - "Fecha": text date (YYYY-MM-DD)
 * - "Bowl Price": $8.00 to $10.00 (price of the bowl)
 * - "Gaseosas": daily sodas sold (negatively correlated with Bowl Price; positively correlated with Bowls)
 * - "Cervezas": daily beers sold (mild positive relationship)
 * - "Dia Promo": binary 0/1 flag (useful to illustrate logistic regression warning in Step 3 and variable selection)
 * - "Bowls Vendidos": continuous numeric target (~200 - 14 * Bowl Price + 1.15 * Gaseosas + 0.35 * Cervezas + noise)
 */
export function generateBowlsDataset(): DataRow[] {
  const rows: DataRow[] = [];
  const rng = createSeededRng(20260415);
  const randn = createNormalSampler(9876543);

  const startDate = new Date(2025, 0, 1);
  const priceOptions = [8.0, 8.25, 8.5, 8.75, 9.0, 9.25, 9.5, 9.75, 10.0];

  for (let i = 0; i < 186; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const fecha = `${yyyy}-${mm}-${dd}`;

    // Price between $8.00 and $10.00
    const priceIdx = Math.floor(rng() * priceOptions.length);
    const bowlPrice = priceOptions[priceIdx];

    // Binary indicator (0/1) for promotion day (weak/redundant once Bowl Price is known)
    const diaPromo = bowlPrice <= 8.5 && rng() < 0.55 ? 1 : rng() < 0.14 ? 1 : 0;

    // Sodas move inversely with Bowl Price (lower bowl price attracts more combo buyers)
    const rawSodas = 76 - 10.5 * (bowlPrice - 9.0) + randn() * 6.5;
    const gaseosas = Math.max(42, Math.min(115, Math.round(rawSodas)));

    // Beers have moderate variance and gentle positive co-movement with traffic
    const rawBeers = 26 + 0.16 * (gaseosas - 76) + randn() * 5.2;
    const cervezas = Math.max(10, Math.min(52, Math.round(rawBeers)));

    // True DGP for Bowls Vendidos:
    // Slope on Bowl Price ~ -14 bowls per dollar, Gaseosas ~ +1.10, Cervezas ~ +0.42
    const noise = randn() * 6.8;
    const rawBowls =
      208.0 -
      14.2 * bowlPrice +
      1.12 * gaseosas +
      0.42 * cervezas +
      0.25 * diaPromo +
      noise;
    const bowlsVendidos = Math.max(85, Math.round(rawBowls));

    rows.push({
      Fecha: fecha,
      'Bowl Price': Number(bowlPrice.toFixed(2)),
      Gaseosas: gaseosas,
      Cervezas: cervezas,
      'Dia Promo': diaPromo,
      'Bowls Vendidos': bowlsVendidos,
    });
  }

  return rows;
}
