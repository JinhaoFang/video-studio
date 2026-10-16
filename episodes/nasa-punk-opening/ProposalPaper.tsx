/**
 * One taped study sheet in paper coordinates: meatball header above the grid,
 * Inter Bold NASA and a ruled title block. S06 closes in on the header; S07
 * reveals the whole sheet. All textures and the insignia are #62's local assets.
 * Pass local circle/nickname/grid/logotype start frames; shared finish/subtitles are
 * supplied by Opening. Exported for #68's continuation of the same study sheet.
 */
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { font } from "../../src/styles/nasa-punk/fonts";
import {
  color,
  motion,
  proposal,
  typeScale,
} from "../../src/styles/nasa-punk/tokens";
import { TypedText } from "./Hud";
import { RedAnnotation } from "./RedAnnotation";

const paper = proposal.paper;
const asset = (name: string) =>
  staticFile(`episodes/nasa-punk-opening/${name}`);

export const ProposalPaper = ({
  circleStart,
  nicknameStart,
  gridStart,
  logotypeStart,
}: {
  circleStart: number;
  nicknameStart: number;
  gridStart: number;
  logotypeStart: number;
}) => {
  const frame = useCurrentFrame();
  const gridOpacity = interpolate(
    frame,
    [gridStart, gridStart + motion.dissolveFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const logotypeOpacity = interpolate(
    frame,
    [logotypeStart, logotypeStart + motion.dissolveFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return (
    <div
      style={{
        position: "absolute",
        width: paper.width,
        height: paper.height,
        backgroundColor: color.paper,
        rotate: `${paper.rotation}deg`,
        transformOrigin: "0 0",
        boxShadow: `0 ${paper.shadowY}px ${paper.shadowBlur}px ${color.nearBlack}`,
        color: color.ink,
      }}
    >
      <Img
        src={asset("textures/paper-ivory-generated.png")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: paper.textureOpacity,
          mixBlendMode: "multiply",
        }}
      />
      <svg
        width={paper.width}
        height={paper.height}
        style={{ position: "absolute", inset: 0 }}
      >
        {[paper.registrationInset, paper.width - paper.registrationInset].map(
          (x) =>
            [
              paper.registrationInset,
              paper.height - paper.registrationInset,
            ].map((y) => (
              <g
                key={`${x}:${y}`}
                stroke={color.inkMuted}
                strokeWidth={paper.ruleWidth}
                fill="none"
              >
                <circle cx={x} cy={y} r={paper.registrationRadius} />
                <path
                  d={`M ${x - paper.registrationArm} ${y} H ${x + paper.registrationArm} M ${x} ${y - paper.registrationArm} V ${y + paper.registrationArm}`}
                />
              </g>
            )),
        )}
      </svg>
      <Img
        src={asset("logos/nasa-meatball.svg")}
        style={{ position: "absolute", ...paper.badge }}
      />
      <div
        style={{
          position: "absolute",
          left: paper.year.left,
          top: paper.year.top,
          fontFamily: font.mono,
          fontSize: paper.year.size,
          fontWeight: typeScale.hudLabel.weight,
          lineHeight: 1,
        }}
      >
        1974
      </div>
      <div
        style={{
          position: "absolute",
          left: paper.insignia.left,
          top: paper.insignia.top,
          fontFamily: font.mono,
          fontSize: paper.insignia.size,
          letterSpacing: typeScale.hudLabel.letterSpacing,
          color: color.inkSoft,
        }}
      >
        {'INSIGNIA · "THE MEATBALL"'}
      </div>
      <RedAnnotation shape="circle" {...paper.circle} start={circleStart} />
      <div
        style={{
          position: "absolute",
          left: paper.nickname.left,
          top: paper.nickname.top,
          fontFamily: font.cjk,
          fontSize: paper.nickname.size,
          fontWeight: typeScale.subtitle.weight,
          color: color.accentRed,
          lineHeight: 1,
        }}
      >
        <TypedText text={'"肉丸"'} start={nicknameStart} />
      </div>
      <div
        style={{
          position: "absolute",
          left: paper.documentCode.left,
          top: paper.documentCode.top,
          fontFamily: font.mono,
          fontSize: paper.documentCode.size,
          letterSpacing: typeScale.credit.letterSpacing,
          color: color.inkMuted,
        }}
      >
        NHB 1430.2 · §1.1
      </div>
      <svg
        width={paper.grid.width}
        height={paper.grid.height}
        style={{
          position: "absolute",
          left: paper.grid.left,
          top: paper.grid.top,
          opacity: gridOpacity,
        }}
      >
        <g
          stroke={color.inkMuted}
          strokeWidth={paper.gridStroke}
          opacity={paper.gridOpacity}
        >
          {Array.from(
            { length: Math.floor(paper.grid.width / paper.grid.cell) + 1 },
            (_, index) => (
              <path
                key={`v${index}`}
                d={`M ${index * paper.grid.cell} 0 V ${paper.grid.height}`}
              />
            ),
          )}
          {Array.from(
            { length: Math.floor(paper.grid.height / paper.grid.cell) + 1 },
            (_, index) => (
              <path
                key={`h${index}`}
                d={`M 0 ${index * paper.grid.cell} H ${paper.grid.width}`}
              />
            ),
          )}
          <rect
            width={paper.grid.width}
            height={paper.grid.height}
            fill="none"
          />
        </g>
        <text
          x={paper.logotype.left}
          y={paper.logotype.baseline}
          fontFamily={font.helvetica}
          fontSize={paper.logotype.size}
          fontWeight={typeScale.hudLabel.weight}
          fill={color.ink}
          opacity={logotypeOpacity}
        >
          NASA
        </text>
      </svg>
      <div
        style={{
          position: "absolute",
          left: paper.title.left,
          top: paper.title.top,
          width: paper.title.width,
          height: paper.title.height,
          border: `${paper.ruleWidth}px solid ${color.inkMuted}`,
          fontFamily: font.mono,
          fontSize: paper.insignia.size,
          letterSpacing: typeScale.credit.letterSpacing,
          color: color.inkSoft,
        }}
      >
        <div
          style={{
            height: paper.title.row,
            borderBottom: `${paper.ruleWidth}px solid ${color.inkMuted}`,
            paddingLeft: paper.title.padding,
            display: "flex",
            alignItems: "center",
            fontWeight: typeScale.hudLabel.weight,
          }}
        >
          NASA · LOGOTYPE STUDY
        </div>
        <div
          style={{
            display: "flex",
            height: paper.title.height - paper.title.row,
          }}
        >
          <div
            style={{
              flex: 1,
              paddingLeft: paper.title.padding,
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              gap: paper.ruleWidth,
            }}
          >
            <div>DANNE &amp; BLACKBURN</div>
            <div>NEW YORK</div>
          </div>
          <div
            style={{
              width: paper.title.yearWidth,
              borderLeft: `${paper.ruleWidth}px solid ${color.inkMuted}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: typeScale.hudBar.size,
              fontWeight: typeScale.hudLabel.weight,
            }}
          >
            1974
          </div>
        </div>
      </div>
      {proposal.tape.corners.map((corner, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: corner.left,
            top: corner.top,
            width: proposal.tape.width,
            height: proposal.tape.height,
            rotate: `${corner.rotation}deg`,
            clipPath: proposal.tape.edge,
            opacity: proposal.tape.opacity,
            backgroundColor: color.paperShade,
          }}
        >
          <Img
            src={asset("textures/tape-warm-generated.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              mixBlendMode: "multiply",
            }}
          />
        </div>
      ))}
    </div>
  );
};
