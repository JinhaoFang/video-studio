/**
 * Standalone full-length Light-Theme Real-UI Remotion composition for the
 * ClinMesh promo: keeps dark cinematic scenes S01, S02, S07, S08, and B01-B03
 * while upgrading clinical workflow scenes S03-S06 to authentic @2x Light-Theme
 * ClinMesh workstation captures and updated L010 doctor sign-off narration.
 */
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sentenceFrame } from "../../src/kit/sentence-timing";
import type { ClinMeshPromoProps } from "./ClinMeshPromo";
import { PromoAudioLight } from "./PromoAudioLight";
import { PromoFinish } from "./PromoFinish";
import { PromoSubtitles } from "./PromoSubtitles";
import { ShotS01Opening } from "./ShotS01Opening";
import { ShotS02Architecture } from "./ShotS02Architecture";
import { ShotS03LightOutpatient } from "./ShotS03LightOutpatient";
import { ShotS04LightInpatientDrg } from "./ShotS04LightInpatientDrg";
import { ShotS05LightQualityGate } from "./ShotS05LightQualityGate";
import { ShotS06LightSignoff } from "./ShotS06LightSignoff";
import { ShotS07PathologyMultimodal } from "./ShotS07PathologyMultimodal";
import { ShotS08SynergyFinale } from "./ShotS08SynergyFinale";
import { BreatherCard } from "./primitives";
import {
  lightBreatherSpans,
  lightBreatherStartFrame,
} from "./sfx-schedule-light";
import { BREATHER_DURATION_F, promoColor } from "./tokens";

export const ClinMeshPromoLight: React.FC<ClinMeshPromoProps> = ({
  timeline,
  bgm = true,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s02From = sentenceFrame(timeline, "L004");
  const b01From = lightBreatherStartFrame(timeline, "L005");
  const s03From = b01From + BREATHER_DURATION_F;
  const s04From = sentenceFrame(timeline, "L008");
  const b02From = lightBreatherStartFrame(timeline, "L008");
  const s05From = b02From + BREATHER_DURATION_F;
  const s06From = sentenceFrame(timeline, "L010");
  const b03From = lightBreatherStartFrame(timeline, "L010");
  const s07From = b03From + BREATHER_DURATION_F;
  const s08From = sentenceFrame(timeline, "L013");
  const breathers = lightBreatherSpans(timeline);
  const isLightScene =
    (f >= s03From && f < b02From) || (f >= s05From && f < b03From);

  return (
    <AbsoluteFill style={{ backgroundColor: promoColor.stageBg }}>
      <Sequence
        name="S01 意象序章与品牌立题"
        durationInFrames={s02From}
        premountFor={fps}
      >
        <ShotS01Opening timeline={timeline} />
      </Sequence>

      <Sequence
        name="S02 全院五域基底与四模块插槽架构"
        from={s02From}
        durationInFrames={b01From - s02From}
        premountFor={fps}
      >
        <ShotS02Architecture timeline={timeline} />
      </Sequence>

      <Sequence
        name="S03 浅色门诊无感成文与指南候选"
        from={s03From}
        durationInFrames={s04From - s03From}
        premountFor={fps}
      >
        <ShotS03LightOutpatient timeline={timeline} />
      </Sequence>

      <Sequence
        name="S04 浅色住院冠脉耗材与病组精算"
        from={s04From}
        durationInFrames={b02From - s04From}
        premountFor={fps}
      >
        <ShotS04LightInpatientDrg timeline={timeline} />
      </Sequence>

      <Sequence
        name="S05 浅色逐句原话溯源与质控拦截"
        from={s05From}
        durationInFrames={s06From - s05From}
        premountFor={fps}
      >
        <ShotS05LightQualityGate timeline={timeline} />
      </Sequence>

      <Sequence
        name="S06 浅色医生核对与正式签署"
        from={s06From}
        durationInFrames={b03From - s06From}
        premountFor={fps}
      >
        <ShotS06LightSignoff timeline={timeline} />
      </Sequence>

      <Sequence
        name="S07 自研病理切片识别与多病种智能体"
        from={s07From}
        durationInFrames={s08From - s07From}
        premountFor={fps}
      >
        <ShotS07PathologyMultimodal timeline={timeline} />
      </Sequence>

      <Sequence
        name="S08 全院六岗汇聚与终章品牌定格"
        from={s08From}
        durationInFrames={timeline.durationInFrames - s08From}
        premountFor={fps}
      >
        <ShotS08SynergyFinale timeline={timeline} />
      </Sequence>

      {breathers.map((b) => (
        <Sequence
          key={b.id}
          name={`${b.id} 章节呼吸字卡`}
          from={b.from}
          durationInFrames={b.durationInFrames}
          premountFor={fps}
        >
          <BreatherCard
            chapterNo={b.chapterNo}
            titlePrefix={b.titlePrefix}
            accentWord={b.accentWord}
            durationInFrames={b.durationInFrames}
          />
        </Sequence>
      ))}

      {!isLightScene ? <PromoFinish /> : null}
      <PromoSubtitles timeline={timeline} />
      <PromoAudioLight timeline={timeline} bgm={bgm} />
    </AbsoluteFill>
  );
};
