#!/usr/bin/env node
/**
 * 提供用户通过命令行执行逻辑
 *
 * @name cli命令声明
 * @group module
 */

import { cac } from 'cac';

import { getConfig, getPackageJSON, getCwd } from './helper/utils';
import unused, { Options as unUsedOptions } from './unused';
import schema from './schema';

const cli = cac('fura');
const cwd = getCwd();

console.info(`当前运行目录:${cwd}`);

cli
  .command('unused', '指定入口文件分析项目内无效依赖项目, 默认拿当前执行目录')
  .option('-c,-config <configPath>', '指定配置文件地址')
  // .option('-o,-output <outputPath>', '输出文件的地址')
  // .option(
  //   '-t,-type [type]',
  //   '指定输出的报告类型 log,html,excel,canvas,json(Default is json)',
  // )
  .action(async ({ c, t }: { c?: string; t?: unUsedOptions['outputType'] }) => {
    const config = getConfig(c);

    await unused(cwd, config('entry', true), {
      alias: config('alias'),
      exclude: config('exclude'),
      include: config('include', true),
      outputType: t,
    });
    process.exit(0);
  });

cli
  .command('schema', '基于入口文件生成关系图')
  .option('-c,-config <configPath>', '指定配置文件地址')
  // .option('-o,-output <outputPath>', '输出文件的地址')
  // .option(
  //   '-t,-type [type]',
  //   '指定输出的报告类型 log,html,excel,canvas,json(Default is json)',
  // )
  .action(async ({ c }: { c?: string }) => {
    // const config = getConfig(c);
    const config = getConfig(c);

    await schema(cwd, config('entry', true), {
      alias: config('alias'),
      exclude: config('exclude'),
      include: config('include', true),
    });
    process.exit(0);
  });

cli.help();
cli.version(getPackageJSON().version);

cli.parse();
