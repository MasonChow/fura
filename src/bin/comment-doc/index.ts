/**
 * @module 输出文件依赖关系
 */
// import lodash from 'lodash';
// import ora from 'ora';
import { Config, CommonOptions } from '../helper/type';
import core from '../../core';
import { conversionToMedia, flowChats } from '../../helper/mermaid';
import { isJsOrTsFileType } from '../../helper/utils';
import diskCache from '../../helper/diskCache';

async function commentDoc(
  target: string,
  entry: Required<Config>['entry'],
  options: CommonOptions,
) {
  const instance = await core({
    cwd: target,
    options,
  });

  const { infoMap, relations } =
    await instance.analysis.getFlattenFileFullRelation(entry[0]);

  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  relations.forEach((rel) => {
    const fromData = infoMap.get(rel.from);
    const toData = infoMap.get(rel.to);

    // 过滤掉非js/ts文件
    if (
      !fromData ||
      !isJsOrTsFileType(fromData.type) ||
      !toData ||
      !isJsOrTsFileType(toData.type)
    ) {
      return;
    }

    const fromId = fromData.id;
    const toId = toData.id;

    params.itemMap[fromId] = {
      name: fromData.attr?.name || fromData.name,
      type: fromData.isEntry ? 'circle' : undefined,
    };

    params.itemMap[toId] = {
      name: fromData.attr?.name || fromData.name,
    };

    params.links.push([String(fromId), String(toId)]);
  });

  const flowChatsContent = flowChats.createFlowcharts(params);

  const svgFile = await conversionToMedia(flowChatsContent, 'svg');

  const filePath = diskCache.writeFileSync(
    './comment-relation.svg',
    String(svgFile),
  );

  diskCache.writeFileSync('./comment-relation.txt', String(flowChatsContent));

  console.info('生成结果路径:', filePath);
}

export default commentDoc;
