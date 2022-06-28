import * as srt from '../common/srt';

const SUBTITLES_JSON_ELEMENT_NAME = 'subtitles-json';

function getSubtitlesJsonString(): string {
  const element = document.getElementById(SUBTITLES_JSON_ELEMENT_NAME);
  if (element === null) {
    throw new Error(`element '${SUBTITLES_JSON_ELEMENT_NAME}' not found`);
  }
  return element.innerHTML;
}

export function getSubtitles(): srt.Subtitle[] {
  const subtitlesJsonString = getSubtitlesJsonString();
  const subtitlesJson: srt.Subtitle[] = JSON.parse(subtitlesJsonString);
  return subtitlesJson;
}
