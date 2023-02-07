#!/usr/bin/env node
/**
 * @module 提供用户通过命令行执行
 */

import { cac } from 'cac';

const cli = cac('fura');

cli
  .command('run <dir>', '分析目录')
  .option('-c, <configPath>', '指定配置文件地址')
  .action(async (target: string, { c }: { c: string }) => {
    const { run } = await import('../cli/run');
    await run(target, c);
    process.exit(0);
  });

cli.help();
cli.version('0.0.1');

cli.parse();
