# ElevenLabs API 核对：模型、连续性、计费与预设音色

核对日期：2026-10-15。范围：工单 #63 / 父 spec #60 的配音 API 接入。仅访问 ElevenLabs 官方公开文档、公开价格页与免鉴权只读 API；未读取凭据、未请求合成服务。以下是当日资料快照，模型可用性、费率和账号权限仍应由运行时的只读预检确认。

## 模型 ID 与接口

- **【事实】`eleven_v4` 存在，不是 `eleven_v3` 的别名。** Models 总表分别列出 `eleven_v4`、`eleven_v4_turbo`、`eleven_v3`、`eleven_v3_conversational`；同页将 v3 称为 previous generation。表中 v4 单次上限 10,000 字符，v3 为 5,000 字符。[Models](https://elevenlabs.io/docs/overview/models.md)
- **【事实】v4 可以调用 Text to Speech。** 官方帮助明确写明：以 `model_id: "eleven_v4"` 使用 Create speech / Stream speech，多人对白使用 Create dialogue / Stream dialogue。不能根据 Models 页仅提到 Text to Dialogue，就判断 v4 不支持 TTS。[What is Eleven v4?](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/what-is-eleven-v4.md)
- **【事实】v4 的设置不能照搬 v3 或 Multilingual v2。** 官方仅列 Stability、Similarity；Style、Speed sliders 不可用，SSML 不支持。[Eleven v4](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4.md)
- **【实现约束】不要静默把 v4 替换为 v3。** 两者的模型 ID、上限、控制能力和连续性支持有差异；若账号未开放指定模型，应由预检报错并保留诊断证据。此条是依据上述事实给出的工程建议。

## `previous_text` / `next_text` 与请求串接

| 项目 | 官方说明 | 出处 |
|---|---|---|
| TTS `previous_text` | 当前生成之前的文本，用来改善多个片段连接时的连续性，或影响本次生成的连续性 | [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert.md) |
| TTS `next_text` | 当前生成之后的文本，作用同上 | [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert.md) |
| TTS 同时传文本与对应 request IDs | `previous_request_ids` 优先于 `previous_text`；`next_request_ids` 优先于 `next_text`；每侧最多 3 个 request IDs，同模型衔接效果最佳 | [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert.md) |
| v3 支持限制 | Request stitching **不支持 `eleven_v3`**；通用接口有这些字段，不代表任意模型都支持 | [Stitching multiple requests](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching.md) |
| v4 的官方用例 | 同一指南的 Python、TypeScript 示例均用 TTS convert + `eleven_v4` + previous request IDs | [Stitching multiple requests](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching.md) |
| request ID 时效 | 应不超过两小时；流式响应必须完整读取后，才能用它的 request ID 作后续条件 | [Stitching multiple requests](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching.md) |
| 零保留模式 | `enable_logging: false` 会使 history 功能不可用，包含 request stitching；此模式限 Enterprise | [Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert.md) |
| Dialogue 参数名 | 为 `previous_text` / **`future_text`**，每侧最多 100 字符，且并非每个模型支持；不要与 TTS 的 `next_text` 混用 | [Create dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert.md) |

**【资料边界】** 当前 TTS Create speech 字段说明没有给 `previous_text`、`next_text` 单独列出长度上限，也没有明确说明它们是否计入账单。不能把 Dialogue 的 100 字符上限当成 TTS 的官方规定，也不能把“上下文免费”写成已核实事实。拼接自然程度仍需试听，不能由参数存在推断。

## 计费与响应头

- **【事实】准确响应头名是 `character-cost`，单数。** 官方串接指南将它解释为 “cost of the generation in characters”，并使用 `request-id` 追踪串接。实现应记下服务实际返回的数值，而非只按输入字符串长度假定已经扣费多少。[Stitching multiple requests](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching.md)
- **【事实】Models API 暴露模型费率字段。** `model_rates.character_cost_multiplier` 表示字符成本倍率，`cost_discount_multiplier` 表示估价折扣倍率、默认 1；同一模型对象还有 `token_cost_factor`。文档示例数字仅为示例，不能当成指定账号上 v4 的实际倍率。[List models](https://elevenlabs.io/docs/api-reference/models/list.md)
- **【事实】credit 与输入字符数不是在所有场景下一一对应。** 官方称 credits 曾叫 characters，但使用量取决于套餐、网页或 API、产品和模型。[What are credits?](https://elevenlabs.io/docs/help-center/account/general/what-are-credits.md)
- **【事实】当日公开 API 价格页列 v4、v3 都为 `$0.08 / 1K characters`，v4 Turbo、v3 Conversational 都为 `$0.04 / 1K characters`，价格不含税。** 这些公开美元单价不等于账号内 credit 扣减倍率，也不能保证套餐或折扣不变。[API pricing](https://elevenlabs.io/pricing/api)
- **【事实】v3 的“每字符 1 credit”官方说明明确限定于网站生成；API 有折扣，另查 API pricing。** 不应把该网站规则直接套到 API dry-run。[How much does it cost to generate using Eleven v3?](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-much-does-it-cost-to-generate-using-eleven-v3-alpha.md)
- **【资料边界】** 本次未鉴权请求 `GET /v1/models` 返回 HTTP 404，未获得当前账号的实际倍率；这不推翻官方文档列出的模型 ID。执行付费合成前，应使用现有凭据做只读模型查询，并保存脱敏后的费率元数据与预算估算。合成后以 `character-cost` 和账号 usage 变化核对实际成本。

## Daniel、Alice 的官方预设 ID

2026-10-15，免鉴权只读 `GET https://api.elevenlabs.io/v1/voices` 实际返回以下记录；仅摘录名称、ID、分类，没有调用音频生成。[官方 Voices API 响应](https://api.elevenlabs.io/v1/voices)

| 工单名称 | 官方当前名称 | Voice ID | category |
|---|---|---|---|
| Daniel | Daniel - Steady Broadcaster | `onwK4e9ZLuTAKqWW03F9` | `premade` |
| Alice | Alice - Clear, Engaging Educator | `Xb7hH8MSUJpSbSDYk0k2` | `premade` |

**【事实】音色是否可用还取决于账号。** 官方说明 Default voices 仅供 2026 年 3 月以前创建的账号使用，并将于 2026-12-31 结束提供；可从 My Voices 或带账号上下文的 List voices 查询 ID。因此公开 ID 核对不能代替本次账号可用性预检。[How do I access ElevenLabs Default voices?](https://elevenlabs.io/docs/help-center/product/voices/my-voices/how-do-i-access-eleven-labs-default-voices.md)

**【事实】官方的替代建议为 Alice → Alicia、Daniel → Finley，并明确它们不是严格一对一替代、音色风格会不同。** 工单指定 Daniel/Alice 时，工程实现应报告不可用情况，由设计负责人决定替换，不能自动改用建议音色。[What are Default voices?](https://elevenlabs.io/docs/help-center/product/voices/my-voices/what-are-default-voices.md)

## 复核方式

官方文档普通 HTML 请求在本环境出现 HTTP 403；按官方索引的说明，在页面路径后加 `.md` 可读取官方 Markdown。事实均引用上述一方来源，没有用搜索摘要或第三方转述替代原文。[官方文档索引](https://elevenlabs.io/docs/llms.txt)
