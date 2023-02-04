/**
 * @module 命令行入口执行文件
 */

import { cac } from 'cac';
import { readFileSync } from 'fs';
import core, { Config as CoreConfig } from '../core';
import { GetObjectType } from '../typings/common';

const cli = cac('fura');

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

cli
  .command('run <dir>', '分析目录')
  .option('-c, <configPath>', '指定配置文件地址')
  .action(async (target, { c }: { c: string }) => {
    const actionConfig: Config = JSON.parse(readFileSync(c).toString());
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

    console.log('执行完成');
    process.exit(0);
  });

cli.help();
cli.version('0.0.1');

cli.parse();
