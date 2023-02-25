/**
 * 通过注释生成关联文档内容
 *
 * @name 生成项目文档内容
 * @group module
 */
// import lodash from 'lodash';
import ora from 'ora';
import { Config, CommonOptions } from '../helper/type';
import core from '../../core';
import {
  // conversionToMedia,
  conversionOriginUrl,
  flowChats,
} from '../../helper/mermaid';
import { isJsOrTsFileType } from '../../helper/utils';
// import diskCache from '../../helper/diskCache';

async function commentDoc(
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

  const { infoMap, relations } =
    await instance.analysis.getFlattenFileFullRelation(entry[1]);

  spinner.text = '分析生成结果';

  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  const simpleRelationMap = new Map<number, number[]>();
  const simpleRelations = new Set<`${number}-${number}`>();

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

    simpleRelationMap.set(fromId, [
      ...(simpleRelationMap.get(fromId) || []),
      toId,
    ]);
  });

  function getAvailableNextIds(nextId: number): number[] {
    const info = infoMap.get(nextId)!;

    if (info.attr?.name) {
      return [nextId];
    }

    const nextRelation = simpleRelationMap.get(nextId);

    if (nextRelation) {
      return nextRelation.map(getAvailableNextIds).flat();
    }

    return [];
  }

  [...simpleRelationMap.keys()].forEach((fromId) => {
    const fromData = infoMap.get(fromId)!;
    const nextIds = simpleRelationMap.get(fromId)!;

    if (fromData.attr?.name) {
      params.itemMap[fromId] = {
        name: fromData.attr.name,
        type: fromData.isEntry ? 'circle' : undefined,
      };

      const simpleRelation = nextIds.map(getAvailableNextIds).flat();

      simpleRelation.forEach((nextId) => {
        const nextData = infoMap.get(nextId)!;
        const uniqRelation = `${fromId}-${nextId}` as const;
        params.itemMap[nextId] = {
          name: nextData.attr?.name || nextData.name,
        };

        if (!simpleRelations.has(uniqRelation)) {
          simpleRelations.add(uniqRelation);
          params.links.push([String(fromId), String(nextId)]);
        }
      });
    }
  });

  const flowChatsContent = flowChats.createFlowcharts(params);

  // const svgFile = await conversionToMedia(flowChatsContent, 'svg');
  const url = conversionOriginUrl(flowChatsContent);

  // const filePath = diskCache.writeFileSync(
  //   './comment-relation.svg',
  //   String(svgFile),
  // );

  // diskCache.writeFileSync('./comment-relation.mmd', String(flowChatsContent));
  spinner.stop();
  // console.info('生成结果路径:', filePath);
  console.info('生成结果:', url);
}

export default commentDoc;
