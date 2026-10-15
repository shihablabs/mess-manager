/**
 * Converts English digits to Bengali numerals
 */
export function toBengaliNumber(val: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return val.toString().replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)]);
}

/**
 * Format currency with ৳ symbol and optional Bengali numeral conversion
 */
export function formatTaka(
  amount: number,
  options: {
    showSign?: boolean;
    useBengaliDigits?: boolean;
    decimals?: number;
  } = {}
): string {
  const { showSign = false, useBengaliDigits = false, decimals = 0 } = options;
  const isPositive = amount > 0;
  const isNegative = amount < 0;

  const absAmount = Math.abs(amount);
  const formatted = decimals > 0 ? absAmount.toFixed(decimals) : Math.round(absAmount).toLocaleString('en-US');

  let result = formatted;
  if (useBengaliDigits) {
    result = toBengaliNumber(result);
  }

  const symbol = '৳';
  if (showSign && isPositive) {
    return `+${symbol}${result}`;
  }
  if (isNegative) {
    return `-${symbol}${result}`;
  }
  return `${symbol}${result}`;
}
