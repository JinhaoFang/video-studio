/**
 * Four discrete SVG study stages: Inter Bold, separated rounded strokes,
 * joined strokes with A crossbars, and the unmodified Wikimedia worm outlines.
 * The three filled paths below are copied byte-for-byte from #62's nasa-worm.svg;
 * stage 2 reuses the second A for the first and ends S before the joining leg;
 * a mask traces the red overlay. No path interpolation.
 * Parent SVG supplies the grid coordinate system. Stage 1 matches ProposalPaper.
 * TODO(design): confirm the conservative stage-2 separation and stroke-trace
 * centerlines; they do not alter the final filled outline.
 */
import { useId } from "react";
import { font } from "../../src/styles/nasa-punk/fonts";
import {
  color,
  proposal,
  typeScale,
  wormStudy,
} from "../../src/styles/nasa-punk/tokens";

export const wormPaths = [
  "M91.991,104.699c1.576,5.961,4.119,8.266,8.613,8.266c4.659,0,7.102-2.799,7.102-8.266V3.2h29.184v101.499 c0,14.307-1.856,20.506-9.11,27.762c-5.228,5.229-14.871,9.271-27.047,9.271c-9.837,0-19.25-3.256-25.253-9.27 c-5.263-5.273-8.154-10.689-12.672-27.764L44.9,37.033c-1.577-5.961-4.119-8.265-8.613-8.265c-4.66,0-7.103,2.798-7.103,8.265 v101.5H0v-101.5C0,22.727,1.857,16.527,9.111,9.271C14.337,4.044,23.981,0,36.158,0c9.837,0,19.25,3.257,25.253,9.27 c5.263,5.273,8.154,10.689,12.672,27.764L91.991,104.699z",
  "M478.038,138.533L444.334,33.096c-0.372-1.164-0.723-2.152-1.263-2.811 c-0.926-1.127-2.207-1.719-3.931-1.719c-1.723,0-3.004,0.592-3.931,1.719c-0.539,0.658-0.891,1.646-1.262,2.811l-33.703,105.437 h-30.167l36.815-115.177c1.918-6,4.66-11.094,8.139-14.488C421.002,3.047,428.038,0,439.141,0s18.14,3.047,24.109,8.867 c3.479,3.395,6.221,8.488,8.14,14.488l36.814,115.177H478.038z",
  "M328.878,138.533c19.12,0,28.446-4.062,35.814-11.389c8.153-8.105,12.053-16.973,12.053-30.213 c0-11.699-4.283-22.535-10.804-29.019c-8.526-8.479-19.116-11.151-36.384-11.151L305.37,56.76c-9.242,0-12.925-1.117-15.839-3.98 c-2.001-1.964-2.939-4.885-2.939-8.328c0-3.559,0.857-7.074,3.303-9.475c2.171-2.131,5.13-3.109,10.816-3.109h69.903V3.2H306.05 c-19.12,0-28.445,4.063-35.814,11.389c-8.152,8.105-12.053,16.972-12.053,30.212c0,11.701,4.283,22.536,10.804,29.019 c8.527,8.479,19.116,11.152,36.384,11.152l24.188,0.002c9.242,0,12.925,1.115,15.839,3.979c2.001,1.965,2.939,4.885,2.939,8.328 c0,3.559-0.857,7.074-3.302,9.475c-2.172,2.131-5.131,3.109-10.817,3.109h-72.094l-27.651-86.509 c-1.918-6-4.66-11.094-8.139-14.488C220.363,3.047,213.327,0,202.224,0s-18.14,3.047-24.108,8.867 c-3.48,3.395-6.221,8.488-8.139,14.488l-36.815,115.177h30.166l33.704-105.437c0.372-1.164,0.723-2.152,1.263-2.811 c0.926-1.127,2.208-1.719,3.931-1.719s3.004,0.592,3.931,1.719c0.54,0.658,0.891,1.646,1.262,2.811l33.704,105.437H328.878z",
] as const;

const separatedS = `${wormPaths[2].split("h-72.094")[0]}H275V138.533H328.878Z`;

export const WormLogotype = ({
  stage,
  opacity = 1,
  redProgress = 0,
}: {
  stage: 1 | 2 | 3 | 4;
  opacity?: number;
  redProgress?: number;
}) => {
  const id = useId().replace(/:/g, "");
  const logo = wormStudy.logotype;
  const paper = proposal.paper;
  if (stage === 1) {
    return (
      <text
        x={paper.logotype.left}
        y={paper.logotype.baseline}
        fontFamily={font.helvetica}
        fontSize={paper.logotype.size}
        fontWeight={typeScale.hudLabel.weight}
        fill={color.ink}
        opacity={opacity}
      >
        NASA
      </text>
    );
  }
  return (
    <svg
      x={logo.left}
      y={logo.top}
      width={logo.width}
      height={(logo.width * logo.sourceHeight) / logo.sourceWidth}
      viewBox={`0 0 ${logo.sourceWidth} ${logo.sourceHeight}`}
      opacity={opacity}
      overflow="visible"
    >
      <defs>
        <mask
          id={`${id}-red`}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={logo.sourceWidth}
          height={logo.sourceHeight}
        >
          {logo.traces.map((d, index) =>
            redProgress * logo.traces.length > index ? (
              <path
                key={index}
                d={d}
                fill="none"
                stroke="white"
                strokeWidth={logo.traceWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={
                  1 -
                  Math.max(
                    0,
                    Math.min(1, redProgress * logo.traces.length - index),
                  )
                }
              />
            ) : null,
          )}
        </mask>
      </defs>
      <g fill={color.ink}>
        {stage === 2 ? (
          <>
            <path d={wormPaths[0]} />
            <path
              d={wormPaths[1]}
              transform={`translate(${logo.firstAOffset} 0)`}
            />
            <path d={separatedS} />
            <path d={wormPaths[1]} />
          </>
        ) : (
          wormPaths.map((d, index) => (
            <path key={index} d={d} fill={color.ink} />
          ))
        )}
        {stage !== 4
          ? logo.crossbars.map((bar, index) => (
              <rect key={index} {...bar} fill={color.ink} />
            ))
          : null}
      </g>
      {redProgress > 0 ? (
        <g mask={redProgress < 1 ? `url(#${id}-red)` : undefined}>
          {wormPaths.map((d, index) => (
            <path key={index} d={d} fill={color.wormRed} />
          ))}
        </g>
      ) : null}
    </svg>
  );
};
