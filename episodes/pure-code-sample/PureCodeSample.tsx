/** 两版成片共用镜头预览。按全片帧定位镜头，传入镜头内帧，各自加载对应的生成混音。 */
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { ShotPreview } from "../../src/kit/samples/ShotPreview.tsx";
import { locateShot } from "../../src/kit/shots.ts";
import { defaultPost } from "../after-rain/tokens.ts";
import { shotTable } from "./model.ts";
import { shots } from "./shots/index.ts";
import { surface, usePlates } from "./samples/usePlates.ts";

export type PureCodeSampleProps = { variant: "a" | "b" };

export const PureCodeSample: React.FC<PureCodeSampleProps> = ({ variant }) => {
  const { row, localFrame } = locateShot(shotTable, useCurrentFrame());
  const inputs = usePlates();
  const shot =
    row.id === "S1" ? shots.s1 : shots[variant === "a" ? "s2-a" : "s2-b"];
  return (
    <ShotPreview
      shot={shot}
      inputs={inputs}
      surface={surface}
      defaults={defaultPost}
      frame={localFrame}
    />
  );
};

export const PureCodeSampleA: React.FC = () => (
  <AbsoluteFill>
    <PureCodeSample variant="a" />
    <Audio src={staticFile("episodes/pure-code-sample/mix-a.wav")} />
  </AbsoluteFill>
);

export const PureCodeSampleB: React.FC = () => (
  <AbsoluteFill>
    <PureCodeSample variant="b" />
    <Audio src={staticFile("episodes/pure-code-sample/mix-b.wav")} />
  </AbsoluteFill>
);
