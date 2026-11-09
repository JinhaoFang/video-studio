/**
 * Master Remotion composition for the 90-second ClinMesh promo: sequences scenes
 * S01-S08 and chapter breathers B01-B03 from measured sentence anchors, layered
 * with PromoFinish, PromoSubtitles, and PromoAudio (bgm toggleable via props).
 */
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { PromoAudio } from "./PromoAudio";
import { PromoFinish } from "./PromoFinish";
import { PromoSubtitles } from "./PromoSubtitles";
import { ShotS01Opening } from "./ShotS01Opening";
import { ShotS02Architecture } from "./ShotS02Architecture";
import { ShotS03AmbientOutpatient } from "./ShotS03AmbientOutpatient";
import { ShotS04InpatientDrg } from "./ShotS04InpatientDrg";
import { ShotS05ExplicitAssistant } from "./ShotS05ExplicitAssistant";
import { ShotS06SafetyGate } from "./ShotS06SafetyGate";
import { ShotS07PathologyMultimodal } from "./ShotS07PathologyMultimodal";
import { ShotS08SynergyFinale } from "./ShotS08SynergyFinale";
import { BreatherCard } from "./primitives";
import { breatherSpans, breatherStartFrame } from "./sfx-schedule";
import { BREATHER_DURATION_F, promoColor } from "./tokens";

export type ClinMeshPromoProps = {
  timeline: Timeline;
  bgm?: boolean;
};

export const ClinMeshPromo: React.FC<ClinMeshPromoProps> = ({
  timeline,
  bgm = true,
}) => {
  const { fps } = useVideoConfig();
  const s02From = sentenceFrame(timeline, "L004");
  const b01From = breatherStartFrame(timeline, "L005");
  const s03From = b01From + BREATHER_DURATION_F;
  const s04From = sentenceFrame(timeline, "L008");
  const b02From = breatherStartFrame(timeline, "L008");
  const s05From = b02From + BREATHER_DURATION_F;
  const s06From = sentenceFrame(timeline, "L010");
  const b03From = breatherStartFrame(timeline, "L010");
  const s07From = b03From + BREATHER_DURATION_F;
  const s08From = sentenceFrame(timeline, "L013");
  const breathers = breatherSpans(timeline);

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
        name="S03 门诊无感成文与指南候选"
        from={s03From}
        durationInFrames={s04From - s03From}
        premountFor={fps}
      >
        <ShotS03AmbientOutpatient timeline={timeline} />
      </Sequence>

      <Sequence
        name="S04 住院冠脉耗材与 DRG 精算"
        from={s04From}
        durationInFrames={b02From - s04From}
        premountFor={fps}
      >
        <ShotS04InpatientDrg timeline={timeline} />
      </Sequence>

      <Sequence
        name="S05 逐句原话溯源与临床质控拦截"
        from={s05From}
        durationInFrames={s06From - s05From}
        premountFor={fps}
      >
        <ShotS05ExplicitAssistant timeline={timeline} />
      </Sequence>

      <Sequence
        name="S06 医生终审与拍板留痕"
        from={s06From}
        durationInFrames={b03From - s06From}
        premountFor={fps}
      >
        <ShotS06SafetyGate timeline={timeline} />
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

      <PromoFinish />
      <PromoSubtitles timeline={timeline} />
      <PromoAudio timeline={timeline} bgm={bgm} />
    </AbsoluteFill>
  );
};
