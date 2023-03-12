#!/usr/bin/env node
/**
 * 提供用户通过命令行执行逻辑
 *
 * @name cli命令声明
 * @group module
 */

import { cac } from 'cac';
import Table from 'easy-table';

import { getConfig, getPackageJSON, getCwd } from './helper/utils';
import * as git from '../helper/git';
import unused, { Options as unUsedOptions } from './unused';
import schema from './schema';
import diffInfluence from './diffInfluence';
import npmPkg from './npmPkg';

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
  .command('schema [...path]', '基于文件生成关系图')
  .option('-c,-config <configPath>', '指定配置文件地址')
  .action(async (path: string[] | undefined, { c }: { c?: string }) => {
    const config = getConfig(c);

    await schema(cwd, path?.length ? path : config('entry', true), {
      alias: config('alias'),
      exclude: config('exclude'),
      include: config('include', true),
    });
    process.exit(0);
  });

// 后续调整成git-diff
cli
  .command('diff-influence <origin-branch>', '变更影响范围')
  .option('-c,-config <configPath>', '指定配置文件地址')
  .action(async (originBranch: string, { c }: { c?: string }) => {
    git.checkHasUnStaged();

    console.info(
      `基于git diff分析代码变更，当前对比目标分支为: ${git.getBranch()} -> ${originBranch}`,
    );

    const config = getConfig(c);

    const gitDiffs = git.getDiffFiles(originBranch);
    const diffTable = new Table();

    gitDiffs.forEach((files) => {
      diffTable.cell('type', files.type);
      diffTable.cell('name', files.file);
      diffTable.newRow();
    });

    console.info(`当前项目变更代码文件为: \n`);
    console.info(diffTable.toString());

    const modifyFiles = [
      ...new Set([
        ...gitDiffs.filter((e) => e.type !== 'del').map((e) => e.file),
      ]),
    ];

    await diffInfluence(cwd, modifyFiles, {
      alias: config('alias'),
      exclude: config('exclude'),
      include: config('include', true),
    });

    process.exit(0);
  });

cli
  .command('pkg <...packages>', 'npm包影响范围')
  .option('-c,-config <configPath>', '指定配置文件地址')
  .action(async (packages, { c }: { c?: string }) => {
    console.info('分析包影响范围', packages);
    const config = getConfig(c);

    await npmPkg(cwd, packages, {
      alias: config('alias'),
      exclude: config('exclude'),
      include: config('include', true),
    });

    process.exit(0);
  });

cli.help();
cli.version(getPackageJSON().version);

cli.parse();
