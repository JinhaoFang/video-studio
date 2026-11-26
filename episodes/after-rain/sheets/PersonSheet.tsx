/** 人的设定图的入口，合成 AfterRainPersonSheet 已在 episodes/Root.tsx 登记，改设定图只改这个文件和它引用的模块。待定事项：#181 换成下半身转面、走路、停步、竹篮和远处小人影，交付前是空白样张。 */
import { AbsoluteFill } from "remotion";
import { sheet } from "../tokens.ts";

export const PersonSheet = () => (
  <AbsoluteFill style={{ backgroundColor: sheet.ground }} />
);
