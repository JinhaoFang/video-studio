/** 按期注册合成；按需加载各期，避免其他期的字体初始化进入纯代码渲染。 */
import { Composition, Folder } from "remotion";
import type { ClinMeshPromoProps } from "./clinmesh-promo/ClinMeshPromo";
import promoTimeline from "./clinmesh-promo/data/timeline.json";
import { PureCodeSample } from "./pure-code-sample/PureCodeSample";
import { durationInFrames as pureCodeDuration } from "./pure-code-sample/model";
import { EngineStill, stillSize } from "./pure-code-sample/samples/EngineStill";
import { ModelSheet, sheetSize } from "./pure-code-sample/samples/ModelSheet";
import { ShotPreview } from "./pure-code-sample/samples/ShotPreview";
import { shots as pureCodeShots } from "./pure-code-sample/shots/index";
import timeline from "./nasa-punk-opening/data/timeline.json";
import type { Timeline } from "../tools/timeline-types";

const loadOpening = () =>
  import("./nasa-punk-opening/Opening").then(({ Opening }) => ({
    default: Opening,
  }));
const loadPromo = () =>
  import("./clinmesh-promo/ClinMeshPromo").then(({ ClinMeshPromo }) => ({
    default: ClinMeshPromo,
  }));

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="pure-code-sample">
      <Composition
        id="PureCodeSample"
        component={PureCodeSample}
        durationInFrames={pureCodeDuration}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="PureCodeModelSheet"
        component={ModelSheet}
        durationInFrames={sheetSize.durationInFrames}
        fps={24}
        width={sheetSize.width}
        height={sheetSize.height}
      />
      <Composition
        id="PureCodeEngineStill"
        component={EngineStill}
        durationInFrames={stillSize.durationInFrames}
        fps={24}
        width={stillSize.width}
        height={stillSize.height}
      />
      <Composition
        id="PureCodeS1"
        component={ShotPreview}
        durationInFrames={pureCodeShots["s1"].durationInFrames}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{ shot: "s1" as const }}
      />
      <Composition
        id="PureCodeS2A"
        component={ShotPreview}
        durationInFrames={pureCodeShots["s2-a"].durationInFrames}
        fps={24}
        width={1920}
        height={1080}
        defaultProps={{ shot: "s2-a" as const }}
      />
      <Composition
        id="PureCodeS2B"
        component={ShotPreview}
        durationInFrames={pureCodeShots["s2-b"].durationInFrames}
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
