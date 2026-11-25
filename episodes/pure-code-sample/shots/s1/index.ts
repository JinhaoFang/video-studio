/** 镜头 S1「雨停」的入口（#153）。现在是占位：从参考机位慢慢推到 S1 末尾机位；#153 换成正式镜头，导出名 s1 不变。 */
import { reference } from "../../scene.ts";
import { placeholderShot, s1End } from "../placeholder.ts";

export const s1 = placeholderShot("S1", 168, reference, s1End, true);
