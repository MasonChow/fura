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
import { isJsOrTsFileType } from '../helper/utils';
import diskCache from '../helper/diskCache';
import { GetMapValue } from '../typings/utils';

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

  const results = await Promise.all(
    entry.map((entryFile) =>
      instance.analysis.getFlattenFileFullRelation(entryFile),
    ),
  );

  // 把多个map合成一个
  const infoMap = results
    .map((e) => e.infoMap)
    .reduce((pre, cur) => {
      [...cur.keys()].forEach((key) => {
        const preItem = pre.get(key);
        const curItem = cur.get(key)!;
        // 避免合并map的过程中覆盖了isEntry字段
        if (preItem && preItem.isEntry) {
          curItem.isEntry = true;
        }
        pre.set(key, curItem);
      });

      return pre;
    }, new Map<number, GetMapValue<Awaited<ReturnType<typeof instance.analysis.getFlattenFileFullRelation>>['infoMap']>>());

  // 把多个relations合成一个
  const relations = results.map((e) => e.relations).flat();

  spinner.text = '分析生成结果';

  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  const simpleRelationMap = new Map<number, number[]>();
  const simpleRelations = new Set<`${number}-${number}`>();
  const lock = new Set<`${number}-${number}`>();

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
      return nextRelation
        .map((nextRelationId) => {
          const lockKey = `${nextId}-${nextRelationId}` as const;
          if (lock.has(lockKey)) {
            return [];
          }
          lock.add(lockKey);
          return getAvailableNextIds(nextRelationId);
        })
        .flat();
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

  diskCache.writeFileSync('./comment-relation.mmd', String(flowChatsContent));
  spinner.stop();
  console.info('生成结果:', url);
}

export default schema;
