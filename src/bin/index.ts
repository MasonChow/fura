#!/usr/bin/env node
/**
 * @module 提供用户通过命令行执行
 */

import { cac } from 'cac';
import * as utils from './helper/utils';
import core from '../core';

const cli = cac('fura');

cli
  .command(
    'invalid-deps [path]',
    '指定入口文件分析项目内无效依赖项目, 默认拿当前执行目录',
  )
  .option('-c,-config <configPath>', '指定配置文件地址')
  .option('-o,-output <outputPath>', '输出文件的地址')
  .option(
    '-t,-type [type]',
    '指定输出的报告类型 log,html,excel,canvas,json(Default is json)',
  )
  .action(
    async (target: string, { c }: { c?: string; t: string; o: string }) => {
      const config = utils.getConfig(c);
      const alias = config('alias');
      const exclude = config('exclude');
      const deadCode = config('deadCode', true);

      const instance = await core({
        cwd: target,
        options: {
          alias,
          exclude,
        },
      });

      const { entry, include } = deadCode;
      const { files, npmPkgs } = await instance.getUnusedDeps(entry[0], {
        include,
      });

      console.info(`未使用文件数量为${files.length}个`);
      files.forEach((file) => {
        console.info(`文件路径:${file.path} 文件大小:${file.size}`);
      });

      console.info(`未使用npm数量为${npmPkgs.length}个`);
      npmPkgs.forEach((pkg) => {
        console.info(`包名:${pkg.name}`);
      });

      process.exit(0);
    },
  );

cli.help();
cli.version('0.0.1');

cli.parse();
