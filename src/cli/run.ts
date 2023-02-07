import fs from 'fs';
import core, { Config as CoreConfig } from '../core';
import { GetObjectType } from '../typings/common';

type CoreConfigOptions = GetObjectType<CoreConfig, 'options'>;

interface Config {
  alias: CoreConfigOptions['alias'];
  exclude: CoreConfigOptions['exclude'];
  /** 检测未使用的文件和导出, 后续api实现参考 https://umijs.org/docs/api/config#deadcode */
  deadCode: {
    /** 入口文件夹，默认src */
    entry: string;
    /** 入口文件，默认index */
    entryFile: string;
  };
}

export async function run(target: string, configPath: string) {
  const actionConfig: Config = JSON.parse(
    fs.readFileSync(configPath).toString(),
  );

  const { alias, exclude, deadCode } = actionConfig;

  const instance = await core({
    cwd: target,
    options: {
      alias,
      exclude,
    },
  });

  const result: any = {
    ...(await instance.getProjectFiles()),
  };

  if (deadCode !== undefined) {
    const { entry, entryFile } = deadCode;

    const unusedDeps = await instance.getUnusedDeps({
      entryDirPath: entry,
      rootFilePath: entryFile,
    });

    result.unusedDeps = unusedDeps;
  }
}

export default run;
