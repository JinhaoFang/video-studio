/**
 * Editorial frame finish for ClinMesh promo: subtle radial vignette and a 6-tile
 * cached SVG fractalNoise grain overlay stepping every 2 frames.
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { promoColor, promoFinish } from "./tokens";

const GRAIN_TILES: string[] = Array.from({ length: 6 }, (_, idx) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed="${idx + 11}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="256" height="256" filter="url(#n)"/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
});

export const PromoFinish: React.FC = () => {
  const frame = useCurrentFrame();
  const stepIdx = Math.floor(frame / 2);
  const tile = GRAIN_TILES[stepIdx % GRAIN_TILES.length];
  const ox = Math.round(Math.sin(stepIdx * 12.9898) * 64);
  const oy = Math.round(Math.cos(stepIdx * 78.233) * 64);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1380px 860px at 50% 46%, transparent ${promoFinish.vignetteInnerPct}%, ${promoColor.stageBg} 100%)`,
          opacity: promoFinish.vignetteOpacity,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: tile,
          backgroundRepeat: "repeat",
          backgroundPosition: `${ox}px ${oy}px`,
          mixBlendMode: "overlay",
          opacity: promoFinish.grainOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
