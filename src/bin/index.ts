#!/usr/bin/env node
/**
 * @module 提供用户通过命令行执行
 */

import { cac } from 'cac';
import { getConfig, getPackageJSON } from './helper/utils';
import unused, { Options as unUsedOptions } from './unused';

const cli = cac('fura');

cli
  .command(
    'unused [path]',
    '指定入口文件分析项目内无效依赖项目, 默认拿当前执行目录',
  )
  .option('-c,-config <configPath>', '指定配置文件地址')
  // .option('-o,-output <outputPath>', '输出文件的地址')
  // .option(
  //   '-t,-type [type]',
  //   '指定输出的报告类型 log,html,excel,canvas,json(Default is json)',
  // )
  .action(
    async (
      target: string,
      { c, t }: { c?: string; t?: unUsedOptions['outputType'] },
    ) => {
      const config = getConfig(c);

      await unused(target, config('entry', true), {
        alias: config('alias'),
        exclude: config('exclude'),
        include: config('include', true),
        outputType: t,
      });
      process.exit(0);
    },
  );

cli
  .command(
    'comment-doc [path]',
    '指定入口文件分析项目内无效依赖项目, 默认拿当前执行目录',
  )
  .option('-c,-config <configPath>', '指定配置文件地址')
  // .option('-o,-output <outputPath>', '输出文件的地址')
  // .option(
  //   '-t,-type [type]',
  //   '指定输出的报告类型 log,html,excel,canvas,json(Default is json)',
  // )
  .action(async (target: string) => {
    // const config = getConfig(c);
    console.log(target);

    process.exit(0);
  });

cli.help();
cli.version(getPackageJSON().version);

cli.parse();
