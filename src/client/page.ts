import * as srt from '../common/srt';

const SUBTITLES_JSON_ELEMENT_ID = 'subtitles-json';
const SUBTITLES_DISPLAY_ELEMENT_ID = 'subtitles-display';

function getSubtitlesJsonString(): string {
  const element = document.getElementById(SUBTITLES_JSON_ELEMENT_ID);
  if (element === null) {
    throw new Error(`element '${SUBTITLES_JSON_ELEMENT_ID}' not found`);
  }
  return element.innerHTML;
}

export function getSubtitles(): srt.Subtitle[] {
  const subtitlesJsonString = getSubtitlesJsonString();
  const subtitlesJson: srt.Subtitle[] = JSON.parse(subtitlesJsonString);
  return subtitlesJson;
}

export function getSubtitlesDisplayElement(): HTMLElement {
  const element = document.getElementById(SUBTITLES_DISPLAY_ELEMENT_ID);
  if (element === null) {
    throw new Error(`element '${SUBTITLES_DISPLAY_ELEMENT_ID}' not found`);
  }
  return element;
}
