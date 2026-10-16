/**
 * Display spacing for subtitles: insert a normal space between CJK characters
 * and Latin letters or digits ("2020年5月" -> "2020 年 5 月"), as the reference
 * subtitles do. Narration text in the script and timeline stays unchanged.
 */
const cjk = "\\u3400-\\u9fff\\uf900-\\ufaff";
const latin = "A-Za-z0-9";

export const spaceMixedText = (text: string): string =>
  text
    .replace(new RegExp(`([${cjk}])([${latin}])`, "g"), "$1 $2")
    .replace(new RegExp(`([${latin}])([${cjk}])`, "g"), "$1 $2");
