/**
 * Synthesize individual ElevenLabs MP3s with adjacent transcript text.
 * `pnpm tts --help` documents inputs, single-line replacement and a shared
 * cumulative credit ledger. API keys stay in memory; only allowlisted response
 * metadata is persisted. No automatic retries; pending reservations block reuse
 * after interruption until the ledger is reconciled against the account.
 * Seed 0 is best-effort reproducibility, not a waveform equality guarantee.
 * Optional speed and text/context overrides affect synthesis only, never captions.
 */
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { reportError, usageError } from "./cli.ts";
import { parseOptions, positiveInteger } from "./qa-common.ts";
import {
  readSynthesisOverrides,
  readTranscript,
  sentenceIndex,
  synthesisText,
} from "./tts-input.ts";

const usage =
  "pnpm tts --voice <Daniel|Alice|音色ID> --model <模型ID> --from <L001> --to <L022> --transcript <台本.md> --out <素材目录> --ledger <账本.json> [--env <.env>] [--budget <credits>] [--speed <0.7～1.2>] [--overrides <改写.json>] [--replace]";
type Subscription = {
  character_count: number;
  character_limit: number;
  tier: string;
};
type Model = {
  model_id: string;
  can_do_text_to_speech: boolean;
  model_rates: {
    character_cost_multiplier: number;
    cost_discount_multiplier: number;
  };
};
type Voice = { voice_id: string; name: string };
type Entry = {
  id: string;
  voice: string;
  model: string;
  output: string;
  reserved: number;
  credits: number | null;
  status: "pending" | "complete" | "failed";
  requestId?: string | null;
  historyItemId?: string | null;
};
type Ledger = {
  version: 1;
  initial: Subscription;
  latest: Subscription;
  budget: number;
  entries: Entry[];
};
const save = (path: string, data: unknown) => {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporary, path);
};

const main = async () => {
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const { options, positional, help } = parseOptions(
    args.filter((arg) => arg !== "--replace"),
    [
      "--voice",
      "--model",
      "--from",
      "--to",
      "--transcript",
      "--out",
      "--env",
      "--budget",
      "--ledger",
      "--speed",
      "--overrides",
    ],
    usage,
  );
  if (help) {
    console.log(
      `用法：${usage}\n每句生成 MP3 和同名 JSON，带前后各一句原文；边界句省略不存在的上下文。\n默认预算 300 credits，四组试听及重配必须共用同一账本；不自动重试。\n已有文件默认拒绝覆盖；--replace 可单独重配同一句。\n--speed 显式设置 voice_settings.speed，省略时使用服务默认值。\n--overrides 格式：{"L005":{"text":"纳萨自己废过一次"},"L006":{"text":"后来，","previous_text":null,"next_text":null}}；相邻上下文同步使用改写文本，null 表示省略。台本与字幕不变。\nkey 从 elevenlabs_apikey 环境变量或 --env（默认 .env）读取，允许等号两侧空格。\n音频格式 mp3_44100_128，seed=0，其他语音设置使用服务默认值。`,
    );
    return;
  }
  if (positional.length || args.filter((arg) => arg === "--replace").length > 1)
    throw usageError("参数重复或存在多余位置参数。", usage);
  const required = (name: string) => {
    const value = options.get(name);
    if (!value) throw usageError(`缺少 ${name}。`, usage);
    return value;
  };
  const voice = required("--voice");
  const model = required("--model");
  if (!/^[a-zA-Z0-9_-]+$/.test(voice) || !/^[a-zA-Z0-9_-]+$/.test(model))
    throw new Error("音色和模型只能包含英文字母、数字、下划线或连字符。");
  const rows = readTranscript(resolve(required("--transcript")));
  const overrides = readSynthesisOverrides(options.get("--overrides"), rows);
  const speed = options.has("--speed")
    ? Number(options.get("--speed"))
    : undefined;
  if (
    speed !== undefined &&
    (!Number.isFinite(speed) || speed < 0.7 || speed > 1.2)
  )
    throw usageError("--speed 必须在 0.7～1.2 之间。", usage);
  const start = sentenceIndex(required("--from"));
  const end = sentenceIndex(required("--to"));
  if (end < start || end >= rows.length)
    throw new Error("句子范围倒置或超出台本。");
  const directory = resolve(required("--out"));
  const ledgerPath = resolve(required("--ledger"));
  const budget = positiveInteger(options.get("--budget") ?? "300", "--budget");
  for (const row of rows.slice(start, end + 1)) {
    if (
      !replace &&
      ["mp3", "json"].some((extension) =>
        existsSync(join(directory, `${row.id}.${extension}`)),
      )
    )
      throw new Error(`${row.id} 已存在；重配时显式传 --replace。`);
  }
  let key = process.env.elevenlabs_apikey;
  if (!key) {
    const content = readFileSync(
      resolve(options.get("--env") ?? ".env"),
      "utf8",
    );
    key = /^\s*elevenlabs_apikey\s*=\s*(.*?)\s*$/m
      .exec(content)?.[1]
      .replace(/^(["'])(.*)\1$/, "$2");
  }
  if (!key)
    throw new Error("没有找到 elevenlabs_apikey，请检查 --env 或环境变量。");
  const request = async (path: string, body?: unknown) => {
    let response: Response;
    try {
      response = await fetch(`https://api.elevenlabs.io${path}`, {
        method: body ? "POST" : "GET",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(120000),
      });
    } catch {
      throw new Error(
        "ElevenLabs 请求失败或超时；请先核对账本和账户消耗，再决定是否重试。",
      );
    }
    if (!response.ok)
      throw Object.assign(
        new Error(`ElevenLabs 返回 HTTP ${response.status}；未自动重试。`),
        { httpStatus: response.status },
      );
    return response;
  };
  const subscription = async (): Promise<Subscription> => {
    const data = (await (
      await request(`/v1/user/subscription?audit=${Date.now()}`)
    ).json()) as Subscription;
    if (
      !Number.isFinite(data.character_count) ||
      !Number.isFinite(data.character_limit)
    )
      throw new Error("账户额度返回格式无效。");
    return {
      character_count: data.character_count,
      character_limit: data.character_limit,
      tier: data.tier,
    };
  };
  mkdirSync(dirname(ledgerPath), { recursive: true });
  const lockPath = `${ledgerPath}.lock`;
  let lock: number;
  try {
    lock = openSync(lockPath, "wx", 0o600);
  } catch {
    throw new Error(
      "账本已锁定；请确认无其他合成进程，并核对 pending 记录后再恢复。",
    );
  }
  try {
    const account = await subscription();
    const ledger: Ledger = existsSync(ledgerPath)
      ? JSON.parse(readFileSync(ledgerPath, "utf8"))
      : { version: 1, initial: account, latest: account, budget, entries: [] };
    if (
      ledger.version !== 1 ||
      !Array.isArray(ledger.entries) ||
      ledger.budget !== budget
    )
      throw new Error("账本格式或累计预算与本次不一致。");
    if (ledger.entries.some((entry) => entry.status === "pending"))
      throw new Error(
        "账本有未完成请求；请先用账户/历史记录核对消耗，不能直接重试。",
      );
    ledger.latest = account;
    save(ledgerPath, ledger);
    const models = (await (await request("/v1/models")).json()) as Model[];
    const selected = models.find(
      (item: { model_id: string }) => item.model_id === model,
    );
    const multiplier = selected?.model_rates?.character_cost_multiplier;
    if (
      !selected?.can_do_text_to_speech ||
      typeof multiplier !== "number" ||
      !Number.isFinite(multiplier) ||
      multiplier <= 0
    )
      throw new Error("指定模型不可合成或无法取得 credits 倍率。");
    const voices = (
      (await (await request("/v1/voices")).json()) as { voices: Voice[] }
    ).voices;
    const selectedVoice = voices.find(
      (item: { voice_id: string; name: string }) =>
        item.voice_id === voice || item.name.split(" - ")[0] === voice,
    );
    if (!selectedVoice) throw new Error("账户中没有找到指定音色。");
    const spent = () =>
      Math.max(
        ledger.entries.reduce(
          (sum, entry) => sum + (entry.credits ?? entry.reserved),
          0,
        ),
        ledger.latest.character_count - ledger.initial.character_count,
      );
    const estimate = (text: string) =>
      Math.ceil(Array.from(text).length * multiplier);
    const batchCost = rows
      .slice(start, end + 1)
      .reduce(
        (sum, _, offset) =>
          sum + estimate(synthesisText(rows, start + offset, overrides).text),
        0,
      );
    if (
      spent() + batchCost > budget ||
      batchCost > account.character_limit - account.character_count
    )
      throw new Error(
        `预计 ${batchCost} credits，超过累计预算或账户剩余额度。`,
      );
    mkdirSync(directory, { recursive: true });
    for (let index = start; index <= end; index++) {
      const row = rows[index];
      const output = join(directory, `${row.id}.mp3`);
      const body = {
        ...synthesisText(rows, index, overrides),
        model_id: model,
        seed: 0,
        ...(speed === undefined ? {} : { voice_settings: { speed } }),
      };
      const before = ledger.latest;
      if (spent() + estimate(body.text) > budget)
        throw new Error("累计 credits 已达到预算，停止合成。");
      const entry: Entry = {
        id: row.id,
        voice,
        model,
        output,
        reserved: estimate(body.text),
        credits: null,
        status: "pending",
      };
      ledger.entries.push(entry);
      save(ledgerPath, ledger);
      try {
        const response = await request(
          `/v1/text-to-speech/${selectedVoice.voice_id}?output_format=mp3_44100_128`,
          body,
        );
        entry.requestId = response.headers.get("request-id");
        entry.historyItemId = response.headers.get("history-item-id");
        const cost = response.headers.get("character-cost");
        if (
          cost !== null &&
          Number.isFinite(Number(cost)) &&
          Number(cost) >= 0
        ) {
          entry.credits = Number(cost);
          save(ledgerPath, ledger);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        if (
          !bytes.length ||
          !response.headers.get("content-type")?.includes("audio")
        )
          throw new Error("服务没有返回音频；请核对账户和请求记录。");
        writeFileSync(`${output}.tmp`, bytes);
        renameSync(`${output}.tmp`, output);
        save(join(directory, `${row.id}.json`), {
          kind: "elevenlabs-sentence",
          version: 1,
          id: row.id,
          voice,
          voiceId: selectedVoice.voice_id,
          model,
          request: body,
          referenceText: row.text,
          audio: output,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          credits: entry.credits,
          modelRates: selected.model_rates,
          requestId: entry.requestId,
          historyItemId: entry.historyItemId,
          accountSnapshot: before,
          createdAt: new Date().toISOString(),
        });
        if (entry.credits === null)
          throw new Error(
            "音频已保存但缺少实际计费响应头，请先核对账户历史记录与账本。",
          );
        entry.status = "complete";
        save(ledgerPath, ledger);
        console.log(
          `${voice} / ${model} / ${row.id}：${entry.credits} credits，${output}`,
        );
      } catch (error) {
        const httpStatus = (error as { httpStatus?: number }).httpStatus;
        if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
          entry.credits = 0;
          entry.status = "failed";
        } else if (entry.credits !== null) entry.status = "failed";
        save(ledgerPath, ledger);
        throw error;
      }
    }
    try {
      ledger.latest = await subscription();
      save(ledgerPath, ledger);
    } catch {
      console.log(
        "额度查询暂时失败；音频与逐请求实际计费已保存，稍后需复核账户余额。",
      );
    }
    console.log(
      `累计消耗：${spent()} / ${budget} credits；账户查询剩余：${ledger.latest.character_limit - ledger.latest.character_count}（额度接口可能延迟，以账本累计预留控制预算）。`,
    );
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
};

main().catch(reportError);
