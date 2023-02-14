#!/usr/bin/env node
/**
 * @module 提供用户通过命令行执行
 */

import { cac } from 'cac';
import Table from 'easy-table';
// import ora from 'ora';
import { getConfig, getPackageJSON } from './helper/utils';
import core from '../core';

const cli = cac('fura');

cli
  .command(
    'unused [path]',
    '指定入口文件分析项目内无效依赖项目, 默认拿当前执行目录',
  )
  .option('-c,-config <configPath>', '指定配置文件地址')
  .option('-o,-output <outputPath>', '输出文件的地址')
  // .option(
  //   '-t,-type [type]',
  //   '指定输出的报告类型 log,html,excel,canvas,json(Default is json)',
  // )
  .action(
    async (
      target: string,
      { c, t = 'log' }: { c?: string; t: string; o: string },
    ) => {
      const config = getConfig(c);
      const alias = config('alias');
      const exclude = config('exclude');
      const deadCode = config('deadCode', true);
      let outputContent: string;

      const instance = await core({
        cwd: target,
        options: {
          alias,
          exclude,
        },
      });

      // spinner.text = '分析依赖关系';

      const { entry, include } = deadCode;
      const { files, npmPkgs } = await instance.getUnusedDeps(entry[0], {
        include,
      });

      // spinner.succeed('分析完成');

      if (t === 'log') {
        if (files.length) {
          const fileTable = new Table();
          files.forEach((file) => {
            fileTable.cell('name', file.name);
            fileTable.cell('path', file.path);
            fileTable.cell('size', file.size);
            fileTable.newRow();
          });

          fileTable.total('name', {
            printer: (val) => {
              return `count: ${val}`;
            },
            reduce: (acc, val, idx) => {
              return idx + 1;
            },
          });

          fileTable.total('size', {
            printer: (val) => {
              return `total: ${val}`;
            },
          });
          outputContent = fileTable.toString();
          console.info('----- 检测到存在未使用文件 ------');
          console.info(outputContent);
        }

        if (npmPkgs.length) {
          const npmPkgsTable = new Table();
          npmPkgs.forEach((npm) => {
            npmPkgsTable.cell('name', npm.name);
            npmPkgsTable.cell('version', npm.version);
            npmPkgsTable.newRow();
          });

          npmPkgsTable.total('name', {
            printer: (val) => {
              return `count: ${val}`;
            },
            reduce: (acc, val, idx) => {
              return idx + 1;
            },
          });
          outputContent = npmPkgsTable.toString();
          console.info(
            '----- 检测到存在未使用的npm包(仅检测dependencies) ------',
          );
          console.info(outputContent);
        }
      }
      process.exit(0);
    },
  );

cli.help();
cli.version(getPackageJSON().version);

cli.parse();
