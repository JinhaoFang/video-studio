/** 按期注册合成；按需加载各期，避免其他期的字体初始化进入纯代码渲染。 */
import { Composition, Folder } from "remotion";
import type { ClinMeshPromoProps } from "./clinmesh-promo/ClinMeshPromo";
import promoTimeline from "./clinmesh-promo/data/timeline.json";
import {
  durationInFrames as afterRainDuration,
  fps as afterRainFps,
  height as afterRainHeight,
  width as afterRainWidth,
} from "./after-rain/model";
import {
  durationInFrames as pureCodeDuration,
  shotTable,
  sampleSize,
} from "./pure-code-sample/model";
import timeline from "./nasa-punk-opening/data/timeline.json";
import type { Timeline } from "../tools/timeline-types";

const loadSampleA = () =>
  import("./pure-code-sample/PureCodeSample").then(({ PureCodeSampleA }) => ({
    default: PureCodeSampleA,
  }));
const loadSampleB = () =>
  import("./pure-code-sample/PureCodeSample").then(({ PureCodeSampleB }) => ({
    default: PureCodeSampleB,
  }));
const loadSheet = () =>
  import("./pure-code-sample/samples/ModelSheet").then(({ ModelSheet }) => ({
    default: ModelSheet,
  }));
const loadStill = () =>
  import("./pure-code-sample/samples/EngineStill").then(({ EngineStill }) => ({
    default: EngineStill,
  }));
const loadPreview = () =>
  import("./pure-code-sample/samples/ShotPreview").then(({ ShotPreview }) => ({
    default: ShotPreview,
  }));
const loadOpening = () =>
  import("./nasa-punk-opening/Opening").then(({ Opening }) => ({
    default: Opening,
  }));
const loadPromo = () =>
  import("./clinmesh-promo/ClinMeshPromo").then(({ ClinMeshPromo }) => ({
    default: ClinMeshPromo,
  }));
const loadAfterRain = () =>
  import("./after-rain/AfterRain").then(({ AfterRain }) => ({
    default: AfterRain,
  }));
const loadSparrowSheet = () =>
  import("./after-rain/sheets/SparrowSheet").then(({ SparrowSheet }) => ({
    default: SparrowSheet,
  }));
const loadPersonSheet = () =>
  import("./after-rain/sheets/PersonSheet").then(({ PersonSheet }) => ({
    default: PersonSheet,
  }));

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="after-rain">
      <Composition
        id="AfterRain"
        lazyComponent={loadAfterRain}
        durationInFrames={afterRainDuration}
        fps={afterRainFps}
        width={afterRainWidth}
        height={afterRainHeight}
      />
      <Composition
        id="AfterRainSparrowSheet"
        lazyComponent={loadSparrowSheet}
        durationInFrames={96}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="AfterRainPersonSheet"
        lazyComponent={loadPersonSheet}
        durationInFrames={96}
        fps={24}
        width={1920}
        height={1080}
      />
    </Folder>
    <Folder name="pure-code-sample">
      <Composition
        id="PureCodeSampleA"
        lazyComponent={loadSampleA}
        durationInFrames={pureCodeDuration}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="PureCodeSampleB"
        lazyComponent={loadSampleB}
        durationInFrames={pureCodeDuration}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="PureCodeModelSheet"
        lazyComponent={loadSheet}
        durationInFrames={sampleSize.durationInFrames}
        fps={24}
        width={sampleSize.width}
        height={sampleSize.height}
      />
      <Composition
        id="PureCodeEngineStill"
        lazyComponent={loadStill}
        durationInFrames={sampleSize.durationInFrames}
        fps={24}
        width={sampleSize.width}
        height={sampleSize.height}
      />
      <Composition
        id="PureCodeS1"
        lazyComponent={loadPreview}
        durationInFrames={shotTable[0].durationInFrames}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{ shot: "s1" as const }}
      />
      <Composition
        id="PureCodeS2A"
        lazyComponent={loadPreview}
        durationInFrames={shotTable[1].durationInFrames}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{ shot: "s2-a" as const }}
      />
      <Composition
        id="PureCodeS2B"
        lazyComponent={loadPreview}
        durationInFrames={shotTable[1].durationInFrames}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{ shot: "s2-b" as const }}
      />
    </Folder>
    <Folder name="nasa-punk-opening">
      <Composition
        id="NasaPunkOpening"
        lazyComponent={loadOpening}
        durationInFrames={timeline.durationInFrames}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ timeline: timeline as Timeline }}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.durationInFrames,
          fps: props.timeline.fps,
        })}
      />
    </Folder>
    <Folder name="clinmesh-promo">
      <Composition
        id="ClinMeshPromo"
        lazyComponent={loadPromo}
        durationInFrames={promoTimeline.durationInFrames}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={
          {
            timeline: promoTimeline as Timeline,
            bgm: true,
          } satisfies ClinMeshPromoProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.durationInFrames,
          fps: props.timeline.fps,
        })}
      />
    </Folder>
  </>
);
