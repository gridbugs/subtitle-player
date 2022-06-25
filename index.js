"use strict";
exports.__esModule = true;
//import express from 'express';
//import fs from 'fs';
var yargs_1 = require("yargs");
function parseArgs() {
    var argv = yargs_1["default"]
        .option('subtitles-path', {
        alias: 's',
        description: 'path to subtitles file',
        type: 'string',
        demandOption: true
    })
        .help()
        .parseSync();
    return {
        subtitlesPath: argv['subtitles-path']
    };
}
function readSubtitlesSync(subtitlesPath) {
    console.log(subtitlesPath);
    return "foo";
}
function run() {
    var subtitlesPath = parseArgs().subtitlesPath;
    readSubtitlesSync(subtitlesPath);
}
run();
