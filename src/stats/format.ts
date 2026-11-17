const coFormatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(decimals: number, useGrouping = true): Intl.NumberFormat {
  const key = `${decimals}-${useGrouping}`;
  let fmt = coFormatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
    coFormatterCache.set(key, fmt);
  }
  return fmt;
}

export function formatNumberCO(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  return getFormatter(decimals, true).format(value);
}

export function formatCompactCO(value: number | null | undefined, maxDecimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatIntCO(value: number | null | undefined): string {
  return formatNumberCO(value, 0);
}

export function formatCurrencyCO(value: number | null | undefined, symbol = '$', decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${formatNumberCO(Math.abs(value), decimals)}`;
}

export function formatPercentCO(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—';
  }
  return `${formatNumberCO(value, decimals)}%`;
}

export function formatPValueCO(p: number | null | undefined): string {
  if (p === null || p === undefined || Number.isNaN(p)) return '—';
  if (p < 0.0001) return '< 0,0001';
  return formatNumberCO(p, 4);
}

/**
 * Wraps R column identifiers in backticks if they contain spaces or special characters.
 */
export function quoteRVar(name: string): string {
  if (/^[A-Za-z.][A-Za-z0-9._]*$/.test(name)) {
    return name;
  }
  return `\`${name.replace(/`/g, '')}\``;
}
