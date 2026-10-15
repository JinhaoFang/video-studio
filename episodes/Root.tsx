/** Register episode compositions in folders; duration follows generated data. */
import { Composition, Folder } from "remotion";
import { Opening } from "./nasa-punk-opening/Opening";
import timeline from "./nasa-punk-opening/data/timeline.json";
import type { Timeline } from "../tools/timeline-types";

export const RemotionRoot: React.FC = () => (
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
);
