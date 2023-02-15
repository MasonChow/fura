/**
 * @module 分析未使用文件
 */
import lodash from 'lodash';
// import ora from 'ora';
import { Config } from '../helper/type';
import core from '../../core';

import { printConsole } from './output';

export type Options = Pick<Config, 'alias' | 'exclude' | 'include'> & {
  outputType?: 'console' | 'html' | 'json' | 'txt';
};

async function unused(
  target: string,
  entry: Required<Config>['entry'],
  options: Options,
) {
  const { alias, exclude, include, outputType = 'console' } = options;
  const instance = await core({
    cwd: target,
    options: {
      alias,
      exclude,
    },
  });

  // 批量分析依赖结果
  const results = await Promise.all(
    entry.map((e) => {
      return instance.getUnusedDeps(e, {
        include,
      });
    }),
  );
  // 取多次的交集即可判断出真正没被使用的文件
  const { files, npmPkgs } = results.reduce((prev, cur, idx) => {
    if (idx === 0) {
      return cur;
    }
    return {
      files: lodash.intersectionBy(prev.files, cur.files, 'id'),
      npmPkgs: lodash.intersectionBy(prev.npmPkgs, cur.npmPkgs, 'id'),
    };
  });

  switch (outputType) {
    case 'console':
      printConsole(files, npmPkgs);
      break;
    default:
      printConsole(files, npmPkgs);
  }
}

export default unused;
