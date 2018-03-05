// @flow
import { unlink, pathExists, readFile, writeFile } from "fs-extra";
import type { Logger } from "log4js";

import AttributeService from "./AttributeService";
import { STATE_ACCEPTED } from "../../types/FileStates";
import {
  TYPE_DEDUPPER_LOCK,
  TYPE_DEDUPPER_CACHE,
  TYPE_UNKNOWN
} from "../../types/ClassifyTypes";
import type { Config, FileInfo } from "../../types";
import type { ClassifyType } from "../../types/ClassifyTypes";
import type { FileState } from "../../types/FileStates";

export default class FileCacheService {
  log: Logger;
  config: Config;
  as: AttributeService;

  constructor(config: Config, as: AttributeService) {
    this.log = config.getLogger(this);
    this.config = config;
    this.as = as;
  }

  getPath = (targetPath?: string) =>
    `${targetPath || this.as.getSourcePath()}.dpcache`;

  createEmptyFileInfo = (): FileInfo => ({
    p_hash: null,
    d_hash: null,
    hash: "",
    damaged: false,
    width: 0,
    height: 0,
    ratio: 0,
    size: 0,
    timestamp: 0,
    name: this.as.getFileName(),
    type: TYPE_UNKNOWN,
    to_path: "",
    from_path: this.as.getSourcePath(),
    state: STATE_ACCEPTED,
    process_state: null
  });

  loadJson = async (targetPath: string): Promise<FileInfo> =>
    JSON.parse(await readFile(targetPath, "utf8"));

  isCacheFileActive = async (targetPath: string): Promise<boolean> => {
    try {
      // const { from_path: fromPath } = await this.loadJson(targetPath);
      const fromPath = this.detectFromPath(targetPath);
      return await pathExists(fromPath);
    } catch (e) {
      this.log.error(e);
      return false;
    }
  };

  clean = async (targetPath?: string): Promise<void> => {
    const cacheFilePath = this.getPath(targetPath);
    if (!await pathExists(cacheFilePath)) {
      return;
    }
    if (await this.isCacheFileActive(cacheFilePath)) {
      return;
    }
    if (!this.config.dryrun) {
      await unlink(cacheFilePath);
    }
  };

  isIgnoreType = (type: ClassifyType) =>
    [TYPE_DEDUPPER_CACHE, TYPE_DEDUPPER_LOCK].includes(type);

  detectState = (cachedState: FileState, targetPath: ?string): FileState => {
    if (!targetPath) {
      return this.as.getState();
    }
    return this.as.getState();
  };

  detectFromPath = (targetPath?: string): string =>
    this.as.getSourcePath(
      targetPath ? targetPath.replace(/\.dpcache$/, "") : undefined
    );

  load = async (targetPath?: string): Promise<?FileInfo> => {
    if (!this.config.cache) {
      return null;
    }
    const type = this.as.detectClassifyType(targetPath);
    if (this.isIgnoreType(type)) {
      return {
        ...this.createEmptyFileInfo(),
        type
      };
    }
    const cacheFilePath = this.getPath(targetPath);
    if (await pathExists(cacheFilePath)) {
      const { birthtime } = await this.as.getFileStat(cacheFilePath);
      const stat = await this.as.getFileStat(targetPath);
      // if timestamp is newer, ignore cache file.
      if (stat.mtime > birthtime || stat.birthtime > birthtime) {
        return null;
      }
      this.log.debug(
        `file info cache hit. path = ${targetPath || this.as.getSourcePath()}`
      );
      const json = await this.loadJson(cacheFilePath);
      const fileInfo = {
        ...json,
        type: this.as.detectClassifyType(targetPath),
        from_path: this.detectFromPath(targetPath),
        to_path: await this.as.getDestPath(targetPath),
        state: this.detectState(json.state, targetPath)
      };
      if (fileInfo.version !== this.config.cacheVersion) {
        return null;
      }
      return fileInfo;
    }
    return null;
  };

  write = async (fileInfo: FileInfo): Promise<void> => {
    try {
      if (!this.config.cache) {
        return;
      }
      const cacheFilePath = this.getPath();
      if (await pathExists(cacheFilePath)) {
        await unlink(cacheFilePath);
      }
      await writeFile(
        cacheFilePath,
        JSON.stringify({
          version: this.config.cacheVersion,
          ...fileInfo
        }),
        "utf8"
      );
      await this.as.touchHide(cacheFilePath, true);
    } catch (e) {
      console.log(e);
      throw e;
    }
  };
}
