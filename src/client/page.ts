import * as srt from '../common/srt';

const SUBTITLES_JSON_ELEMENT_ID = 'subtitles-json';

function getSubtitlesJsonString(): string {
  return getElement(SUBTITLES_JSON_ELEMENT_ID).innerHTML;
}

export function getSubtitles(): srt.Subtitle[] {
  const subtitlesJsonString = getSubtitlesJsonString();
  const subtitlesJson: srt.Subtitle[] = JSON.parse(subtitlesJsonString);
  return subtitlesJson;
}

const SUBTITLES_DISPLAY_ELEMENT_ID = 'subtitles-display';

export function getSubtitlesDisplayElement(): HTMLElement {
  return getElement(SUBTITLES_DISPLAY_ELEMENT_ID);
}

function getParams(): string[] {
  return window.location.search.slice(1).split('&');
}

export function isDebug(): boolean {
  return getParams().indexOf('debug') !== -1;
}

export function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`element '${id}' not found`);
  }
  return element;
}
