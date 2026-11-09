/** Register episode compositions in folders; duration follows generated data. */
import { Composition, Folder } from "remotion";
import {
  ClinMeshPromo,
  type ClinMeshPromoProps,
} from "./clinmesh-promo/ClinMeshPromo";
import { ClinMeshPromoLight } from "./clinmesh-promo/ClinMeshPromoLight";
import { ClinMeshPromoLightPro } from "./clinmesh-promo/ClinMeshPromoLightPro";
import {
  S06_LIGHT_PREVIEW_DURATION_F,
  ShotS06LightSamplePreview,
} from "./clinmesh-promo/ShotS06LightSamplePreview";
import promoLightProTimeline from "./clinmesh-promo/data/timeline-light-pro.json";
import promoLightTimeline from "./clinmesh-promo/data/timeline-light.json";
import promoTimeline from "./clinmesh-promo/data/timeline.json";
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
        id="ClinMeshPromo"
        component={ClinMeshPromo}
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
      <Composition
        id="ClinMeshPromoLight"
        component={ClinMeshPromoLight}
        durationInFrames={promoLightTimeline.durationInFrames}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={
          {
            timeline: promoLightTimeline as Timeline,
            bgm: true,
          } satisfies ClinMeshPromoProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.durationInFrames,
          fps: props.timeline.fps,
        })}
      />
      <Composition
        id="ClinMeshPromoLightPro"
        component={ClinMeshPromoLightPro}
        durationInFrames={promoLightProTimeline.durationInFrames}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={
          {
            timeline: promoLightProTimeline as Timeline,
            bgm: true,
          } satisfies ClinMeshPromoProps
        }
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.durationInFrames,
          fps: props.timeline.fps,
        })}
      />
      <Composition
        id="ClinMeshPromoS06LightPreview"
        component={ShotS06LightSamplePreview}
        durationInFrames={S06_LIGHT_PREVIEW_DURATION_F}
        fps={30}
        width={1920}
        height={1080}
      />
    </Folder>
  </>
);
