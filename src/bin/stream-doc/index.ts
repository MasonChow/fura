/**
 * @module 输出文件依赖关系
 */
// import lodash from 'lodash';
// import ora from 'ora';
import { Config, CommonOptions } from '../helper/type';
import core from '../../core';
import { mermaid } from './output';

async function commentDoc(
  target: string,
  entry: Required<Config>['entry'],
  options: CommonOptions,
) {
  const instance = await core({
    cwd: target,
    options,
  });

  const entryFile = './src/helper/database/index.ts';

  const [upRelation, downRelation] = await Promise.all([
    instance.getFileRelation(entryFile, 'up'),
    instance.getFileRelation(entryFile, 'down'),
  ]);

  const filePath = await mermaid({
    ...upRelation,
    ...downRelation,
    prev: upRelation.prev,
    next: downRelation.next,
  });
  console.info('生成路径:', filePath);
}

export default commentDoc;
