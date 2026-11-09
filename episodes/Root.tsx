/** 按期注册 Remotion 合成，时长与帧率使用对应时间轴的入库数据。 */
import { Composition, Folder } from "remotion";
import {
  ClinMeshPromoLightPro,
  type ClinMeshPromoProps,
} from "./clinmesh-promo/ClinMeshPromoLightPro";
import promoTimeline from "./clinmesh-promo/data/timeline-light-pro.json";
import { Opening } from "./nasa-punk-opening/Opening";
import timeline from "./nasa-punk-opening/data/timeline.json";
import type { Timeline } from "../tools/timeline-types";

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="nasa-punk-opening">
      <Composition
        id="NasaPunkOpening"
        component={Opening}
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
        id="ClinMeshPromoLightPro"
        component={ClinMeshPromoLightPro}
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
