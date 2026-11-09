/**
 * ClinMeshPromo 的最终版：按 timeline.json 的 14 句实测配音安排 S01-S08、
 * 章节呼吸字卡、字幕与音频总线，保留逐音节对齐的镜头提示。
 */
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { PromoAudioLight } from "./PromoAudioLight";
import { PromoFinish } from "./PromoFinish";
import { PromoSubtitles } from "./PromoSubtitles";
import { ShotS01Opening } from "./ShotS01Opening";
import { ShotS02Architecture } from "./ShotS02Architecture";
import { ShotS03LightProOutpatient } from "./ShotS03LightProOutpatient";
import { ShotS04LightProInpatientDrg } from "./ShotS04LightProInpatientDrg";
import { ShotS05LightProQualityGate } from "./ShotS05LightProQualityGate";
import { ShotS06LightProSignoff } from "./ShotS06LightProSignoff";
import { ShotS07PathologyMultimodal } from "./ShotS07PathologyMultimodal";
import { ShotS08SynergyFinale } from "./ShotS08SynergyFinale";
import { BreatherCard } from "./primitives";
import {
  buildLightProSfxSchedule,
  lightBreatherSpans,
  lightBreatherStartFrame,
} from "./sfx-schedule-light-pro";
import { BREATHER_DURATION_F, promoColor } from "./tokens";

export type ClinMeshPromoProps = {
  timeline: Timeline;
  bgm?: boolean;
};

const S02_PRO_DOMAIN_CUES = [9, 25, 44, 67, 112] as const;
const S07_PRO_TAIL_CAM = [
  { frame: 336, cx: 960, cy: 540, zoom: 1.02 },
  { frame: 390, cx: 1038, cy: 576, zoom: 1.13 },
  { frame: 444, cx: 976, cy: 546, zoom: 1.06 },
] as const;
const S08_PRO_ROLE_CUES = [5, 23, 44, 75, 95, 127] as const;

export const ClinMeshPromoLightPro: React.FC<ClinMeshPromoProps> = ({
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
        <ShotS01Opening
          timeline={timeline}
          mid2OffsetF={71}
          lockupOffsetF={100}
          ruleOffsetF={120}
          subtitleOffsetF={130}
        />
      </Sequence>

      <Sequence
        name="S02 全院五域基底与四模块插槽架构"
        from={s02From}
        durationInFrames={b01From - s02From}
        premountFor={fps}
      >
        <ShotS02Architecture
          timeline={timeline}
          domainCueFrames={S02_PRO_DOMAIN_CUES}
          foundationSweepStartF={138}
          plugBaseOffsetF={88}
          plugStaggerF={11}
          snapDoneOffsetF={138}
        />
      </Sequence>

      <Sequence
        name="S03 浅色门诊无感成稿与指南候选"
        from={s03From}
        durationInFrames={s04From - s03From}
        premountFor={fps}
      >
        <ShotS03LightProOutpatient timeline={timeline} />
      </Sequence>

      <Sequence
        name="S04 浅色住院冠脉耗材与病组精算"
        from={s04From}
        durationInFrames={b02From - s04From}
        premountFor={fps}
      >
        <ShotS04LightProInpatientDrg timeline={timeline} />
      </Sequence>

      <Sequence
        name="S05 浅色逐句原话锚定与质控阻断"
        from={s05From}
        durationInFrames={s06From - s05From}
        premountFor={fps}
      >
        <ShotS05LightProQualityGate timeline={timeline} />
      </Sequence>

      <Sequence
        name="S06 浅色执业医师人工核准与签署生效"
        from={s06From}
        durationInFrames={b03From - s06From}
        premountFor={fps}
      >
        <ShotS06LightProSignoff timeline={timeline} />
      </Sequence>

      <Sequence
        name="S07 自研病理切片识别与多病种智能体"
        from={s07From}
        durationInFrames={s08From - s07From}
        premountFor={fps}
      >
        <ShotS07PathologyMultimodal
          timeline={timeline}
          tailCamKeys={S07_PRO_TAIL_CAM}
        />
      </Sequence>

      <Sequence
        name="S08 全院六岗汇聚与终章品牌定格"
        from={s08From}
        durationInFrames={timeline.durationInFrames - s08From}
        premountFor={fps}
      >
        <ShotS08SynergyFinale
          timeline={timeline}
          roleCueFrames={S08_PRO_ROLE_CUES}
          stepBaseFrame={152}
        />
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
      <PromoAudioLight
        timeline={timeline}
        bgm={bgm}
        sfxBuilder={buildLightProSfxSchedule}
      />
    </AbsoluteFill>
  );
};
