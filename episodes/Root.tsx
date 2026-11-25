/** 按期注册合成；按需加载各期，避免其他期的字体初始化进入纯代码渲染。 */
import { Composition, Folder } from "remotion";
import type { ClinMeshPromoProps } from "./clinmesh-promo/ClinMeshPromo";
import promoTimeline from "./clinmesh-promo/data/timeline.json";
import { PureCodeSample } from "./pure-code-sample/PureCodeSample";
import { durationInFrames as pureCodeDuration } from "./pure-code-sample/model";
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
