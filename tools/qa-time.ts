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
      `时间无效「${input}」：请用秒数（12.5）、分:秒（01:12.5）或时:分:秒（00:01:12.500）；不接受负数和帧号，冒号分隔的分、秒必须小于 60。`,
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
  const sign = time.numerator < 0n ? "-" : "";
  const absolute = time.numerator < 0n ? -time.numerator : time.numerator;
  const milliseconds =
    (absolute * 2000n + time.denominator) / (time.denominator * 2n);
  const minutes = (milliseconds / 60000n).toString().padStart(2, "0");
  const seconds = ((milliseconds / 1000n) % 60n).toString().padStart(2, "0");
  const fraction = (milliseconds % 1000n).toString().padStart(3, "0");
  return `${sign}${minutes}:${seconds}.${fraction}`;
};

export const addTime = (a: Time, b: Time): Time => ({
  numerator: a.numerator * b.denominator + b.numerator * a.denominator,
  denominator: a.denominator * b.denominator,
});

export const multiplyTime = (
  time: Time,
  numerator: bigint,
  denominator = 1n,
): Time => ({
  numerator: time.numerator * numerator,
  denominator: time.denominator * denominator,
});

export const subtractTime = (a: Time, b: Time): Time =>
  addTime(a, multiplyTime(b, -1n));
