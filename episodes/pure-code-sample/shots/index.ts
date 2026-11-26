/** 本期所有镜头的登记表：镜头预览合成和成片按这里的键找镜头。S2 有 A（#155）、B（#156）两版，各在自己的目录。 */
import type { Shot } from "../model.ts";
import type { Surface } from "../stage.ts";
import { s1 } from "./s1/index.ts";
import { s2 as s2a } from "./s2-a/index.ts";
import { s2 as s2b } from "./s2-b/index.ts";

export type ShotKey = "s1" | "s2-a" | "s2-b";

export const shots: Record<ShotKey, Shot<Surface>> = { s1, "s2-a": s2a, "s2-b": s2b };
