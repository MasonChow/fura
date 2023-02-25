/**
 * @name 集成api方法提供
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
