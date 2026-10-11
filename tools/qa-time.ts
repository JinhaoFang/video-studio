/**
 * Parse QA times as exact decimal fractions, without rounding frame boundaries.
 * Import parseTimecode for seconds/mm:ss/hh:mm:ss inputs and formatTimecode for
 * ASCII mm:ss.fff labels. Fractions retain sub-millisecond input precision;
 * labels round to milliseconds and minutes can exceed 59 on long videos.
 */
export type Time = { numerator: bigint; denominator: bigint };

export const decimalTime = (value: string): Time => {
  const [whole, fraction = ""] = value.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const sign = whole.startsWith("-") ? -1n : 1n;
  return {
    numerator: BigInt(whole) * denominator + sign * BigInt(fraction || "0"),
    denominator,
  };
};

export const parseTimecode = (input: string): Time => {
  const invalid = (): never => {
    throw new Error(
      `Invalid time "${input}". Use seconds (12.5), mm:ss (01:12.5), or hh:mm:ss (00:01:12.500); no negatives or frame numbers, and colon-separated minutes/seconds must be < 60.`,
    );
  };
  if (
    !/^\d+(?:\.\d+)?$|^\d+:\d+(?:\.\d+)?$|^\d+:\d+:\d+(?:\.\d+)?$/.test(input)
  ) {
    return invalid();
  }
  const parts = input.split(":");
  const seconds = decimalTime(parts.at(-1)!);
  let wholeSeconds = 0n;
  if (parts.length > 1) {
    const minutes = BigInt(parts.at(-2)!);
    if (minutes >= 60n || seconds.numerator >= 60n * seconds.denominator) {
      return invalid();
    }
    wholeSeconds = minutes * 60n;
    if (parts.length === 3) {
      wholeSeconds += BigInt(parts[0]) * 3600n;
    }
  }
  return {
    numerator: wholeSeconds * seconds.denominator + seconds.numerator,
    denominator: seconds.denominator,
  };
};

export const compareTimes = (a: Time, b: Time): number => {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};

export const formatTimecode = (time: Time): string => {
  const milliseconds =
    (time.numerator * 2000n + time.denominator) / (time.denominator * 2n);
  const minutes = (milliseconds / 60000n).toString().padStart(2, "0");
  const seconds = ((milliseconds / 1000n) % 60n).toString().padStart(2, "0");
  const fraction = (milliseconds % 1000n).toString().padStart(3, "0");
  return `${minutes}:${seconds}.${fraction}`;
};
