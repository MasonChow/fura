/**
 * @name 集成封装api方法
 */

import lodash from 'lodash';
import Analysis from '../analysis';
import { GetMapValue } from '../typings/utils';
import logger from '../helper/logger';

export interface Config {
  // 分析入口目录 默认 .
  cwd?: string;
  // 配置项
  options?: {
    // 路径别名 例如 {'@/*': 'src/*'}
    alias?: Record<string, string>;
    // 忽略查询的目录
    exclude?: string[];
    // 指定查询的目录
    include?: string[];
  };
}

/**
 * 提供对应的使用api
 */
export async function main(config: Config) {
  const analysis = new Analysis(config.cwd || process.cwd(), config.options);
  await analysis.analysis();

  return {
    /**
     * 获取整个目录文件信息
     *
     * @returns projectTree 目录书
     * @returns fileMap 存储的文件信息，key为文件id
     * @returns dirMap 存储的文件夹信息，key为文件夹id
     */
    async getProjectFiles() {
      const [{ tree, dirMap }, fileMap] = await Promise.all([
        analysis.getProjectTree(),
        analysis.getProjectFiles(),
      ]);
      return { projectTree: tree, fileMap, dirMap };
    },
    /**
     * 基于注释获取依赖关系
     *
     * @param entryFilePaths 分析的文件入口相对路径，相对于cwd
     * @returns infoMap 对应id的Map数据
     * @returns relations 对应的关系链
     */
    async getRelationFromFileComment(entryFilePaths: string[]) {
      const results = await Promise.all(
        entryFilePaths.map((entryFile) =>
          analysis.getFlattenFileFullRelation(entryFile),
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
        }, new Map<number, GetMapValue<Awaited<ReturnType<typeof analysis.getFlattenFileFullRelation>>['infoMap']>>());

      // 把多个relations合成一个，并去重重复的
      const relations = lodash.uniqWith(
        results.map((e) => e.relations).flat(),
        lodash.isEqual,
      );
      const simpleRelations: Omit<(typeof relations)[0], 'type'>[] = [];

      const simpleRelationMap = new Map<number, number[]>();
      const simpleRelationsSet = new Set<`${number}-${number}`>();
      const lock = new Set<`${number}-${number}`>();

      relations.forEach((rel) => {
        const fromData = infoMap.get(rel.from);
        const toData = infoMap.get(rel.to);

        if (!fromData || !toData) {
          logger.error('缺失对应详情，跳过:');
          logger.error(`fromDataId=${rel.from},fromData:`, fromData);
          logger.error(`toDataId=${rel.to},toData:`, toData);
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
          const simpleRelation = nextIds.map(getAvailableNextIds).flat();

          simpleRelation.forEach((nextId) => {
            const uniqRelation = `${fromId}-${nextId}` as const;

            if (!simpleRelationsSet.has(uniqRelation)) {
              simpleRelationsSet.add(uniqRelation);
              simpleRelations.push({ from: fromId, to: nextId });
            }
          });
        }
      });

      return {
        infoMap,
        relations: simpleRelations,
      };
    },
    /** 分析sdk示例 */
    analysis,
  };
}

type MainReturnType = Awaited<ReturnType<typeof main>>;

export type CoreActionReturnType = {
  [key in keyof MainReturnType]: MainReturnType[key] extends (
    ...args: any
  ) => Promise<any>
    ? Awaited<ReturnType<MainReturnType[key]>>
    : MainReturnType[key];
};

export default main;
