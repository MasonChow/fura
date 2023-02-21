/**
 * @module 主要入口模块，提供对应的操作api
 */

import Analysis from '../analysis';

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
 * @function 提供对应的使用api
 */
export async function main(config: Config) {
  const analysis = new Analysis(config.cwd || process.cwd(), config.options);
  await analysis.analysis();

  return {
    async getProjectFiles() {
      const [{ tree, dirMap }, fileMap] = await Promise.all([
        analysis.getProjectTree(),
        analysis.getProjectFiles(),
      ]);
      return { projectTree: tree, fileMap, dirMap };
    },
    async getUnusedDeps(...args: Parameters<typeof analysis.getUnusedDeps>) {
      return analysis.getUnusedDeps(...args);
    },
    async getFileRelation(
      ...args: Parameters<typeof analysis.getFileRelation>
    ) {
      return analysis.getFileRelation(...args);
    },
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
