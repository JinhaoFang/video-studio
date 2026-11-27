/** 小样按登记键预览单镜头。镜头内帧和已解码底图一并交给 kit。 */
import { ShotPreview as Preview } from "../../../src/kit/samples/ShotPreview.tsx";
import { defaultPost } from "../../after-rain/tokens.ts";
import { shots, type ShotKey } from "../shots/index.ts";
import { surface, usePlates } from "./usePlates.ts";
export const ShotPreview = ({ shot }: { shot: ShotKey }) => {
  const inputs = usePlates();
  return (
    <Preview
      shot={shots[shot]}
      defaults={defaultPost}
      inputs={inputs}
      surface={surface}
    />
  );
};
