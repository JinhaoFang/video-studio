/**
 * Whole-frame finish for every NASA-punk scene: animated fine grain and a warm
 * vignette, on top of all scene layers and under the subtitles.
 * Strength comes from the style tokens; the grain seed cycles per frame.
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { color, finish } from "../../src/styles/nasa-punk/tokens";

export const FilmFinish = () => {
  const frame = useCurrentFrame();
  const seed = frame % finish.grainSeedCycle;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent ${finish.vignetteInner * 100}%, ${color.nearBlack} 100%)`,
          opacity: finish.vignetteStrength,
        }}
      />
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          mixBlendMode: "overlay",
          opacity: finish.grainOpacity,
        }}
      >
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={finish.grainFrequency}
            numOctaves={2}
            seed={seed}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};
