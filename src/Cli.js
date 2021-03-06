// @flow
import commander from "commander";
import type { CommanderConfig } from "./types";

commander
  .allowUnknownOption()
  .option("-x --db-repair", "repair db by log file.")
  .option("-C, --no-cache", "no use file info cache")
  .option("-m, --manual", "the current path is registered in the destination.")
  .option("-k, --keep", "save the file as keeping state")
  .option("-r, --relocate", "relocate saved file")
  .option("-D, --no-dir-keep", "no use old dir path for new path")
  .option("-R, --no-report", "disable report output")
  .option("-v, --verbose", "show debug log")
  .option("-s, --sweep", "sweep mode")
  .option("-q, --quiet", "no prompt window")
  .option("-w, --wait", "wait on process end")
  .option("-l, --log-level [level]", "log level")
  .option("-L, --no-log-config", "no log config")
  .option("-P, --no-p-hash", "skip p-hash matching")
  .option("-p, --path [path]", "target file path")
  .option("-n, --dryrun", "dryrun mode");

export default class Cli {
  parseArgs = (): CommanderConfig => {
    commander.parse(process.argv);
    return ((commander: any): CommanderConfig);
  };
}
