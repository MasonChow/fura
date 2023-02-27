/**
 * 获取两次git版本变更的影响范围
 *
 * @name 基于变更获取影响范围
 * @group module
 */
// import lodash from 'lodash';
import ora from 'ora';
import Table from 'easy-table';
import { Config, CommonOptions } from './helper/type';
import core from '../core';
import {
  // conversionToMedia,
  conversionOriginUrl,
  flowChats,
} from '../helper/mermaid';
import diskCache from '../helper/diskCache';

async function diffInfluence(
  target: string,
  entry: Required<Config>['entry'],
  options: CommonOptions,
) {
  console.info(`当前项目变更代码文件为: \n`);
  const diffTable = new Table();
  entry.forEach((name) => {
    diffTable.cell('name', name);
    diffTable.newRow();
  });
  diffTable.total('name', {
    printer: (val) => {
      return `count: ${val}`;
    },
    reduce: (acc, val, idx) => {
      return idx + 1;
    },
  });
  console.info(diffTable.toString());

  const spinner = ora('分析项目代码').start();
  const instance = await core({
    cwd: target,
    options,
  });
  spinner.text = '解析文件关系';

  const { infoMap, relations } = await instance.getRelationFromFileComment(
    entry,
  );

  spinner.text = '构建关系链路';

  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  relations.forEach((rel) => {
    const { from, to } = rel;
    const fromData = infoMap.get(from);
    const toData = infoMap.get(to);

    params.itemMap[from] = {
      name: fromData?.attr?.name || toData?.name || 'unknown',
      type: fromData?.isEntry ? 'circle' : undefined,
    };

    params.itemMap[to] = {
      name: toData?.attr?.name || toData?.name || 'unknown',
      type: toData?.isEntry ? 'circle' : undefined,
    };

    params.links.push([String(from), String(to)]);
  });

  spinner.text = '生成图例';

  const flowChatsContent = flowChats.createFlowcharts(params);

  const url = conversionOriginUrl(flowChatsContent);

  spinner.text = '写入本地缓存';

  const cachePath = diskCache.writeFileSync(
    './git-diff.mmd',
    String(flowChatsContent),
  );

  spinner.stop();

  console.info('生成结果:', url);
  console.info('结果mermaid内容:', cachePath);
}

export default diffInfluence;
