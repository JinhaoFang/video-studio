"""
Score sentence MP3s on CUDA/float16 using locally cached faster-whisper large-v3.
Called by pnpm qa voice; --help is also available directly. ASR never receives
the reference text as a prompt. Keep raw segments/words and ffmpeg diagnostics.
Edge and ASR mismatch flags are screening heuristics, not proof of truncation.
Decode with ffmpeg into arrays to avoid PyAV decoder API version differences.
Score original narration with date and approved NASA pronunciation equivalence.
"""

import argparse
import hashlib
import importlib.metadata
import json
import math
import re
import subprocess
import sys
import unicodedata
from pathlib import Path
from dataclasses import asdict


class ChineseParser(argparse.ArgumentParser):
    def error(self, message):
        self.exit(2, "出错：参数不完整或无效，请用 --help 查看用法。\n")

    def format_help(self):
        return (
            super()
            .format_help()
            .replace("usage:", "用法：")
            .replace("options:", "选项：")
        )


def run_media(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode:
        raise ValueError(f"{args[0]} 运行失败，请检查输入音频。")
    return result


def write_json(path, value):
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    )


def decode_audio(audio, sample_rate):
    import numpy as np

    decoded = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-nostdin",
            "-i",
            str(audio),
            "-map",
            "0:a:0",
            "-ar",
            str(sample_rate),
            "-ac",
            "1",
            "-f",
            "f32le",
            "-",
        ],
        capture_output=True,
    )
    if decoded.returncode or not decoded.stdout:
        raise ValueError("ffmpeg 解码音频失败。")
    return np.frombuffer(decoded.stdout, dtype="<f4").copy()


def normalize(text):
    return "".join(
        c for c in unicodedata.normalize("NFKC", text).lower() if c.isalnum()
    )


def pronunciation_normalize(text):
    digits = dict(zip("零〇一二两三四五六七八九", [0, 0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]))

    def convert(match):
        number, unit = match.groups()
        if all(c in digits for c in number):
            return "".join(str(digits[c]) for c in number) + unit
        total, current = 0, 0
        for c in number:
            if c in digits:
                current = digits[c]
            else:
                total += (current or 1) * {"十": 10, "百": 100, "千": 1000}[c]
                current = 0
        return str(total + current) + unit

    return normalize(
        re.sub(
            r"纳萨|娜萨|娜莎",
            "NASA",
            re.sub(r"([零〇一二两三四五六七八九十百千]+)(年|月)", convert, text),
        )
    )


def edit_distance(reference, actual):
    previous = list(range(len(actual) + 1))
    for i, expected in enumerate(reference, 1):
        current = [i]
        for j, found in enumerate(actual, 1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + (expected != found),
                )
            )
        previous = current
    return previous[-1]


def measure(audio, evidence):
    probe = json.loads(
        run_media(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "a:0",
                "-show_entries",
                "stream=duration,sample_rate",
                "-of",
                "json",
                str(audio),
            ]
        ).stdout
    )
    duration = len(decode_audio(audio, 44100)) / 44100
    result = run_media(
        [
            "ffmpeg",
            "-hide_banner",
            "-nostats",
            "-nostdin",
            "-i",
            str(audio),
            "-map",
            "0:a:0",
            "-af",
            "ebur128=peak=true:framelog=verbose,silencedetect=noise=-40dB:d=0.01",
            "-f",
            "null",
            "-",
        ]
    )
    evidence.write_text(result.stderr)
    summary = result.stderr[result.stderr.rfind("Summary:") :]
    peak = re.search(r"Peak:\s*(-inf|[-\d.]+)\s+dBFS", summary)
    if not peak:
        raise ValueError("ffmpeg 没有返回真峰值。")
    peak_value = float(peak[1])
    silences, pending = [], None
    for match in re.finditer(r"silence_(start|end):\s*([-\d.]+)", result.stderr):
        value = max(0, min(duration, float(match[2])))
        if match[1] == "start":
            pending = value
        elif pending is not None:
            silences.append(
                {"start": pending, "end": value, "duration": value - pending}
            )
            pending = None
    if pending is not None:
        silences.append(
            {"start": pending, "end": duration, "duration": duration - pending}
        )
    leading = silences[0]["end"] if silences and silences[0]["start"] <= 0.001 else 0
    trailing = (
        duration - silences[-1]["start"]
        if silences and silences[-1]["end"] >= duration - 0.02
        else 0
    )
    internal = [
        s
        for s in silences
        if s["start"] > 0.001 and s["end"] < duration - 0.02 and s["duration"] > 0.4
    ]
    return {
        "durationSeconds": duration,
        "containerDurationSeconds": float(probe["streams"][0]["duration"]),
        "truePeakDbtp": peak_value if math.isfinite(peak_value) else "-Infinity",
        "leadingSilenceSeconds": leading,
        "trailingSilenceSeconds": trailing,
        "silences": silences,
        "internalLongSilences": internal,
        "edgeRisk": {"head": leading < 0.02, "tail": trailing < 0.02},
        "clippingRisk": peak_value >= 0,
    }


def main():
    parser = ChineseParser(
        description="使用本机 GPU Whisper 打分并输出配音对比表。", add_help=False
    )
    parser.add_argument("--help", action="help", help="显示帮助并退出")
    parser.add_argument("--job", required=True, help="由 pnpm qa voice 生成的任务 JSON")
    parser.add_argument(
        "--whisper-model", default="large-v3", help="本地缓存模型名称或路径"
    )
    args = parser.parse_args()
    from faster_whisper import WhisperModel
    import ctranslate2

    if ctranslate2.get_cuda_device_count() < 1:
        raise ValueError("没有可用的 CUDA GPU。")
    model = WhisperModel(
        args.whisper_model, device="cuda", compute_type="float16", local_files_only=True
    )
    job = json.loads(Path(args.job).read_text())
    out = Path(job["out"])
    environment = {
        "python": sys.version,
        "fasterWhisper": importlib.metadata.version("faster-whisper"),
        "ctranslate2": importlib.metadata.version("ctranslate2"),
        "model": args.whisper_model,
        "device": "cuda",
        "computeType": "float16",
        "language": "zh",
        "beamSize": 5,
        "vadFilter": False,
        "referencePrompt": None,
    }
    groups = []
    for name, items in job["groups"].items():
        safe_name = name.replace("/", "-")
        transcripts, measurements, references, actuals = [], [], [], []
        for item in items:
            audio = Path(item["audio"])
            if hashlib.sha256(audio.read_bytes()).hexdigest() != item["sha256"]:
                raise ValueError(f"{item['id']} 音频校验失败。")
            segments, info = model.transcribe(
                decode_audio(audio, 16000),
                language="zh",
                beam_size=5,
                word_timestamps=True,
                condition_on_previous_text=False,
                vad_filter=False,
            )
            raw_segments = [asdict(segment) for segment in segments]
            actual = "".join(segment["text"] for segment in raw_segments).strip()
            reference = item.get("referenceText", item["request"]["text"])
            transcripts.append(
                {
                    "id": item["id"],
                    "text": actual,
                    "segments": raw_segments,
                    "languageProbability": info.language_probability,
                }
            )
            evidence = out / f"{safe_name}-{item['id']}-ffmpeg.txt"
            measured = measure(audio, evidence)
            canonical_reference, canonical_actual = pronunciation_normalize(
                reference
            ), pronunciation_normalize(actual)
            errors = edit_distance(canonical_reference, canonical_actual)
            boundary = {
                "head": not canonical_actual.startswith(canonical_reference[:1]),
                "tail": not canonical_actual.endswith(canonical_reference[-1:]),
            }
            measured.update(
                {
                    "id": item["id"],
                    "audio": str(audio),
                    "reference": reference,
                    "transcription": actual,
                    "normalizedReference": canonical_reference,
                    "normalizedTranscription": canonical_actual,
                    "errors": errors,
                    "referenceCharacters": len(canonical_reference),
                    "asrBoundaryMismatch": boundary,
                }
            )
            measurements.append(measured)
            references.append(reference)
            actuals.append(actual)
            print(
                f"{name} / {item['id']}：{actual}；真峰值 {measured['truePeakDbtp']} dBTP",
                flush=True,
            )
        errors = sum(m["errors"] for m in measurements)
        characters = sum(m["referenceCharacters"] for m in measurements)
        strict_errors = sum(
            edit_distance(normalize(r), normalize(a))
            for r, a in zip(references, actuals)
        )
        strict_characters = sum(len(normalize(r)) for r in references)
        duration = sum(m["durationSeconds"] for m in measurements)
        speech_duration = sum(
            m["durationSeconds"]
            - m["leadingSilenceSeconds"]
            - m["trailingSilenceSeconds"]
            for m in measurements
        )
        risks = [
            f"{m['id']}:{flag}"
            for m in measurements
            for flag, present in {
                "爆音": m["clippingRisk"],
                "边缘截断风险": any(m["edgeRisk"].values()),
                "ASR首尾不符": any(m["asrBoundaryMismatch"].values()),
                "句中长静音": bool(m["internalLongSilences"]),
            }.items()
            if present
        ]
        voice, model_name = name.split("/")
        entries = [
            e
            for e in job["ledger"]["entries"]
            if e["voice"] == voice and e["model"] == model_name
        ]
        credits = sum(
            e["credits"] if e["credits"] is not None else e["reserved"] for e in entries
        )
        group_peak = max(float(m["truePeakDbtp"]) for m in measurements)
        group = {
            "name": name,
            "errors": errors,
            "referenceCharacters": characters,
            "cer": errors / characters,
            "strictCer": strict_errors / strict_characters,
            "charactersPerMinute": strict_characters * 60 / duration,
            "speechCharactersPerMinute": (
                strict_characters * 60 / speech_duration if speech_duration else None
            ),
            "durationSeconds": duration,
            "truePeakDbtp": group_peak if math.isfinite(group_peak) else "-Infinity",
            "risks": risks,
            "credits": credits,
            "measurements": measurements,
        }
        groups.append(group)
        write_json(
            out / f"{safe_name}-whisper.json",
            {"environment": environment, "sentences": transcripts},
        )
        (out / f"{safe_name}-whisper.md").write_text(
            f"# {name}：Whisper 原始转写\n\n"
            + "\n\n".join(f"{t['id']}：{t['text']}" for t in transcripts)
            + "\n"
        )
    ranked = sorted(
        groups,
        key=lambda g: (g["cer"], len(g["risks"]), abs(g["charactersPerMinute"] - 300)),
    )
    ledger = job["ledger"]
    total = sum(
        e["credits"] if e["credits"] is not None else e["reserved"]
        for e in ledger["entries"]
    )
    reported_remaining = (
        ledger["latest"]["character_limit"] - ledger["latest"]["character_count"]
    )
    remaining = min(
        reported_remaining,
        ledger["initial"]["character_limit"]
        - ledger["initial"]["character_count"]
        - total,
    )
    write_json(
        out / "voice-scores.json",
        {
            "environment": environment,
            "groups": groups,
            "recommended": ranked[0]["name"],
            "credits": {
                "total": total,
                "budget": ledger["budget"],
                "remaining": remaining,
                "accountReportedRemaining": reported_remaining,
            },
        },
    )
    sample = groups[0]["measurements"]
    sample_label = f"{sample[0]['id']}～{sample[-1]['id']}"
    date_samples = [
        m for g in groups for m in g["measurements"] if m["reference"] == "2020年5月"
    ]
    date_note = (
        "“2020年5月”各组均完整识别，本次没有证据要求把这个日期改成汉字。"
        if len(date_samples) == len(groups)
        and all(m["errors"] == 0 for m in date_samples)
        else "数字读法应根据逐句原始转写复核；年月的汉字/阿拉伯数字等价不算错读。"
    )
    missing = [
        word
        for word in ["NASA", "1974"]
        if not any(word in m["reference"] for m in sample)
    ]
    coverage = (
        f"样本没有覆盖 {'、'.join(missing)}，不能据此确认它们的读音。"
        if missing
        else "样本中的英文和年份请结合逐句转写复核。"
    )
    lines = [
        f"# 配音试听对比（{sample_label}）",
        "",
        f"推荐候选：**{ranked[0]['name']}**。按读法等价 CER、检测风险数、与 300 字/分钟的距离依次排序；音色审美由设计负责人定。",
        "",
        "| 音色 / 模型 | CER（读法等价） | 严格 CER | 语速：全文件 / 去首尾静音（字/分钟） | 真峰值 dBTP | 截断/长静音等标记 | credits（含重配） |",
        "|---|---:|---:|---:|---:|---|---:|",
    ]
    for g in groups:
        speech_rate = (
            f"{g['speechCharactersPerMinute']:.1f}"
            if g["speechCharactersPerMinute"] is not None
            else "无有效语音"
        )
        lines.append(
            f"| {g['name']} | {g['cer']:.2%} ({g['errors']}/{g['referenceCharacters']}) | {g['strictCer']:.2%} | {g['charactersPerMinute']:.1f} / {speech_rate} | {float(g['truePeakDbtp']):.1f} | {'；'.join(g['risks']) or '未检出'} | {g['credits']} |"
        )
    lines.extend(
        [
            "",
            f"总消耗 **{total} / {ledger['budget']} credits**，保守剩余额度 **{remaining}**（初始额度减逐请求实际计费，与账户最近查询余额 {reported_remaining} 取较小值；账户接口可能延迟）；各组计费包含账本中的失败/重配请求。",
            "",
            "计量：faster-whisper large-v3，CUDA/float16，中文、beam=5、不提供台本提示词、不启用 VAD；逐句原始转写见同目录 *-whisper.md / JSON。CER 为逐句编辑距离之和除参考字符总数，NFKC、忽略标点空白与英文大小写；读法等价列把年月前的汉字数字统一为阿拉伯数字，并把 NASA／纳萨／娜萨／娜莎统一为 NASA；其余差异保留。语速分母分别为解码音频总时长、扣除首尾静音后的总时长，避免 MP3 编码填充影响；分子保留原文数字/英文的字母字符数。",
            "",
            "音频：ffmpeg ebur128 peak=true 测真峰值，>=0 dBTP 标爆音风险；silencedetect 的阈值 -40 dBFS、最短 10ms，严格超过 0.4 秒的句中静音标记。首尾静音少于 20ms、ASR 首尾字不符分别标记截断风险与识别不符；这些检查不能证明发音完整。完整测量在 voice-scores.json，原始音频诊断在 *-ffmpeg.txt。",
            "",
            f"读法建议：{date_note}{coverage}“印着”的“着”等多音字，即使 ASR 转成同一个字，也不能独立证明读音正确；“箭/件/肩”等近音识别差异也应结合这一限制理解。合成改写以设计负责人批准的 overrides 为准；字幕与 CER 参考始终保留原文。",
            "",
        ]
    )
    (out / "comparison.md").write_text("\n".join(lines))
    print(f"推荐候选：{ranked[0]['name']}；总消耗 {total} credits；剩余 {remaining}。")
    print(out / "comparison.md")
    has_risks = any(g["risks"] for g in groups)
    if has_risks:
        print("出错：配音检测发现风险，报告已生成，请查看对比表中的标记。", file=sys.stderr)
    return 1 if has_risks else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        detail = (
            str(error)
            if re.search(r"[\u4e00-\u9fff]", str(error))
            else type(error).__name__
        )
        print(
            f"出错：配音打分运行失败（{detail}），请检查任务、音频、Whisper 缓存及 CUDA 环境。",
            file=sys.stderr,
        )
        sys.exit(2)
