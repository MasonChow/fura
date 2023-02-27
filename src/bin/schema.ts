/**
 * 通过注释生成关联文档内容
 *
 * @name 生成项目文档内容
 * @group module
 */
// import lodash from 'lodash';
import ora from 'ora';
import { Config, CommonOptions } from './helper/type';
import core from '../core';
import {
  // conversionToMedia,
  conversionOriginUrl,
  flowChats,
} from '../helper/mermaid';
import diskCache from '../helper/diskCache';

async function schema(
  target: string,
  entry: Required<Config>['entry'],
  options: CommonOptions,
) {
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

  // const svgFile = await conversionToMedia(flowChatsContent, 'svg');
  const url = conversionOriginUrl(flowChatsContent);

  spinner.text = '写入本地缓存';

  const cachePath = diskCache.writeFileSync(
    './comment-relation.mmd',
    String(flowChatsContent),
  );

  spinner.stop();

  console.info('生成结果:', url);
  console.info('结果mermaid内容:', cachePath);
}

export default schema;
