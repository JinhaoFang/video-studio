/** 黑位回归样张。运行 pnpm exec remotion still episodes/pure-code-sample/samples/PostBlackLevels.tsx PostBlackLevels out/post.png --gl=swangle。同一条后期链连续处理两帧灰阶，逐帧核对黑块的 RGB，再把输出左右并排。 */
import { useLayoutEffect, useRef } from "react";
import { registerRoot, Still } from "remotion";
import { createPost } from "../../../src/kit/engine/post.ts";
import { defaultPost, rain } from "../../after-rain/tokens.ts";

const width = 256;
const height = 64;
const colors = [defaultPost.darkest, rain.eavesDark];

const BlackLevels = () => {
  const sheet = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const input = source.getContext("2d")!;
    const ramp = input.createLinearGradient(width / 4, 0, width, 0);
    ramp.addColorStop(0, "black");
    ramp.addColorStop(1, "white");
    input.fillStyle = ramp;
    input.fillRect(0, 0, width, height);
    const output = source.cloneNode() as HTMLCanvasElement;
    const chain = createPost(output);
    const samples = sheet.current!.getContext("2d")!;
    try {
      for (const [frame, darkest] of colors.entries()) {
        chain.draw(source, frame, { ...defaultPost, darkest, grain: 0, grainHighlight: 0, glow: 0, softFocus: 0 });
        const left = frame * width;
        samples.drawImage(output, left, 0);
        const rgb = samples.getImageData(left, 0, 1, 1).data.slice(0, 3);
        const expected = [1, 3, 5].map((i) => parseInt(darkest.slice(i, i + 2), 16));
        if (rgb.some((value, i) => value !== expected[i])) {
          throw new Error(`第 ${frame} 帧期望黑位 ${darkest}，实得 RGB(${rgb})`);
        }
      }
    } finally {
      chain.dispose();
    }
  }, []);
  return <canvas ref={sheet} width={colors.length * width} height={height} />;
};

registerRoot(() => <Still id="PostBlackLevels" component={BlackLevels} width={colors.length * width} height={height} />);
