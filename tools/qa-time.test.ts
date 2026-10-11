/**
 * Test public QA time parsing and ASCII formatting, including invalid inputs
 * and exact sub-millisecond comparisons. Run with `pnpm verify` or
 * `node --test tools/qa-time.test.ts`; no media fixtures are stored in Git.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { compareTimes, formatTimecode, parseTimecode } from "./qa-time.ts";

test("QA time parsing accepts seconds, minutes, and hours without losing precision", () => {
  for (const input of ["72.5", "01:12.5", "00:01:12.500"]) {
    assert.equal(
      compareTimes(parseTimecode(input), parseTimecode("72.500")),
      0,
    );
    assert.equal(formatTimecode(parseTimecode(input)), "01:12.500");
  }
  for (const [input, expected] of [
    ["0", "00:00.000"],
    ["00:00", "00:00.000"],
    ["00:00:00", "00:00.000"],
    ["59:59.999", "59:59.999"],
    ["01:00:00", "60:00.000"],
    ["3600.000", "60:00.000"],
    ["59.9995", "01:00.000"],
  ]) {
    assert.equal(formatTimecode(parseTimecode(input)), expected);
  }
  assert.equal(
    compareTimes(parseTimecode("0.099999999999999999"), parseTimecode("0.1")),
    -1,
  );
  assert.equal(
    compareTimes(parseTimecode("0.100000000000000001"), parseTimecode("0.1")),
    1,
  );
});

test("QA time parsing rejects illegal syntax and out-of-range colon fields with examples", () => {
  for (const input of [
    "",
    " ",
    "-1",
    "-00:01",
    "00:-01",
    "00:00:-1",
    "+1",
    ".5",
    "1.",
    "1e2",
    "NaN",
    "Infinity",
    "12f",
    "frame:12",
    "1:2:3:4",
    "1::2",
    "00:60",
    "00:60.001",
    "60:00",
    "01:60:00",
    "01:00:60",
    "1:2.5:3",
    " 12.5",
    "12.5 ",
    "1,5",
    "00:00:00:12",
    "0x10",
    "00:00.60.1",
  ]) {
    assert.throws(
      () => parseTimecode(input),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Invalid time/);
        assert.match(error.message, /12\.5/);
        assert.match(error.message, /01:12\.5/);
        assert.match(error.message, /00:01:12\.500/);
        return true;
      },
    );
  }
});
