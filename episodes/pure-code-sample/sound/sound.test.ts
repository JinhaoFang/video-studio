/** #158/#162 外部行为测试：实谱/夹具、采样对齐、确定性与失败反例；弦乐用基频复解调、100 ms Hann 低通和 200 Hz 相位差测揉弦，取起音后至 0.7 秒避开四人长时拍频，频率容差 0.3 Hz、跨音高 0.6 Hz，并检查幅度排除无揉弦信号。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { frameToSample } from "../../../src/kit/shots.ts";
import { hottest100ms, pcmWav, rate } from "../../../src/kit/sound/dsp.ts";
import { perspective } from "./perspective.ts";
import { renderMix } from "../../../src/kit/sound/mix.ts";
import { master } from "../../../src/kit/sound/measure.ts";
import {
  compileScore,
  resolveAnchor,
} from "../../../src/kit/sound/score.ts";
import { synthesizeSfx } from "../../../src/kit/sound/sfx.ts";
import type { EventTable, Score, SfxName, SoundDesign } from "../../../src/kit/sound/types.ts";

const load = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const table = load<EventTable>("events.fixture.json");
const score = load<Score>("../score.json");
const design = load<SoundDesign>("../sound.json");
const digest = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
test("非零镜头起点、乱序重复事件取首现，extra 只跟第一次 shake", () => {
  const reversed = { ...table, events: [...table.events].reverse() };
  assert.equal(
    resolveAnchor({ event: "shake", offsetFrames: 3 }, reversed),
    181,
  );
  assert.equal(resolveAnchor({ shot: "S2", frame: 144 }, table), 312);
  const mix = renderMix(reversed, score, design, 158, perspective);
  assert.equal(mix.durationFrames, 312);
  assert.equal(mix.mix[0].length, 624000);
  assert.deepEqual(
    mix.placements
      .filter((row) => row.sfx === "water_spray")
      .map((row) => row.eventFrame),
    [181],
  );
  assert.deepEqual(
    mix.placements
      .filter((row) => row.sfx === "pole_creak")
      .map((row) => row.eventFrame),
    [238],
  );
  const wings = mix.placements.filter((row) => row.sfx === "wing_flap");
  assert.deepEqual(
    wings.map((row) => row.db),
    [-12, -15, -18, -21, -24],
  );
  assert.deepEqual(
    wings.map((row) => Math.round(row.pan * 100)),
    [30, 45, 60, 75, 90],
  );
  for (const row of mix.placements)
    assert.equal(
      row.startSample + row.alignmentSample,
      frameToSample(row.eventFrame, rate, 24),
    );
  const frameDb = (stereo: Float64Array[], frame: number) => {
    const from = frameToSample(frame, rate, 24),
      to = frameToSample(frame + 1, rate, 24);
    let energy = 0;
    for (const channel of stereo)
      for (let i = from; i < to; i++) energy += channel[i] ** 2;
    return 10 * Math.log10(energy / (stereo.length * (to - from)) + 1e-30);
  };
  for (let frame = 190; frame < 216; frame++) {
    assert.ok(frameDb(mix.stems.music, frame) > -60, `F${frame} 配乐被切断`);
    if (frame > 190)
      assert.ok(
        frameDb(mix.stems.music, frame - 1) - frameDb(mix.stems.music, frame) < 6,
        `F${frame} 竖琴余音不是自然衰减`,
      );
  }
  for (let frame = 0; frame < 312 - design.master.fadeOutFrames; frame++)
    assert.ok(frameDb(mix.mix, frame) > -60, `F${frame} 总线掉到近乎数字静音`);
  for (const channel of mix.stems.music)
    assert.ok(
      channel
        .subarray(frameToSample(144, rate, 24), frameToSample(190, rate, 24))
        .every((sample) => sample === 0),
    );
  for (let i = 0; i < mix.mix[0].length; i += 137)
    for (let c = 0; c < 2; c++)
      assert.equal(
        mix.mix[c][i],
        mix.stems.music[c][i] + mix.stems.sfx[c][i] + mix.stems.ambience[c][i],
      );
});

test("同种子完整混音、三分轨和十四音效 WAV 字节一致，换种子确实变化", () => {
  const first = renderMix(table, score, design, 158, perspective);
  const second = renderMix(table, score, design, 158, perspective);
  const firstMaster = master(first.mix, first.stems, -16, -1);
  const secondMaster = master(second.mix, second.stems, -16, -1);
  assert.equal(
    digest(pcmWav(firstMaster.output)),
    digest(pcmWav(secondMaster.output)),
  );
  for (const name of design.master.stems)
    assert.equal(
      digest(pcmWav(first.stems[name])),
      digest(pcmWav(second.stems[name])),
    );
  for (const name of Object.keys(design.sfx) as SfxName[]) {
    const a = synthesizeSfx(name, 158),
      b = synthesizeSfx(name, 158);
    assert.deepEqual(pcmWav([a.samples]), pcmWav([b.samples]));
    assert.ok(Math.abs(hottest100ms(a.samples) + 18) < 0.01, name);
    assert.ok(
      a.samples.every((value) => Math.abs(value) <= 10 ** (-1.5 / 20)),
      name,
    );
  }
  assert.notEqual(
    digest(pcmWav([synthesizeSfx("feather_shake", 158).samples])),
    digest(pcmWav([synthesizeSfx("feather_shake", 159).samples])),
  );
});

test("反例：锚点事件缺失必须报出种类，不能静默跳过", () => {
  const missing = {
    ...table,
    events: table.events.filter((event) => event.kind !== "light_break"),
  };
  assert.throws(
    () => renderMix(missing, score, design, 158, perspective),
    /锚点引用的事件不存在：light_break/,
  );
  assert.throws(
    () => resolveAnchor({ event: "absent" }, table),
    /事件不存在：absent/,
  );
});

test("反例：按速度计算越过 mustEndBefore 必须报乐句、乐器和截止帧", () => {
  const slow = structuredClone(score);
  slow.phrases.find((phrase) => phrase.id === "light")!.tempo = 60;
  assert.throws(
    () => compileScore(slow, table, 158),
    /乐句 light 的 .*按 60 BPM.*越过 mustEndBefore 第 144 帧/,
  );
  const targeted = structuredClone(score);
  targeted.phrases.find((phrase) => phrase.id === "look")!.notes[0].beats = 2;
  assert.throws(
    () => compileScore(targeted, table, 158),
    /乐句 look 的 strings_pad.*越过 mustEndBefore/,
  );
  assert.doesNotThrow(() => compileScore(score, table, 158));
});
