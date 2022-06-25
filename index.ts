//import express from 'express';
import fs from 'fs';
import yargs from 'yargs';
import * as timestamp from './timestamp';
import * as srt from './srt';

type Args = {
  subtitlesPath: string,
};

function parseArgs(): Args {
  const argv = yargs
    .option('subtitles-path', {
      alias: 's',
      description: 'path to subtitles file',
      type: 'string',
      demandOption: true,
    })
    .help()
    .parseSync();
  return {
    subtitlesPath: argv['subtitles-path'],
  };
}

function readSubtitlesSync(subtitlesPath: string): string {
  const fileContentsBuffer = fs.readFileSync(subtitlesPath);
  return fileContentsBuffer.toString();
}

function run(): void {
  const { subtitlesPath } = parseArgs();
  const srtString = readSubtitlesSync(subtitlesPath);
  const subtitles = srt.parseSrtString(srtString);
  console.log(subtitles.map(srt.prettyPrintSubtitle));
}

run();

//console.log(srt.prettyPrintSubtitlePeriod(srt.parseSrtPeriod('01:41:53,441 --> 01:41:55,660')));
