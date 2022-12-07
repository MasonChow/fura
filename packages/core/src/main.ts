import diskCache from './helper/diskCache';
import AnalysisJS, { AnalysisJSResultType } from './analysis';

export type ResultType = AnalysisJSResultType;

export interface Config {
  // 分析入口目录 默认 .
  cwd?: string;
  // 配置项
  options?: {
    // 路径别名 例如 {'@/*': 'src/*'}
    alias?: Record<string, string>;
    // 忽略查询的目录
    exclude?: string[];
  };
}

async function main(config: Config) {
  console.time('程序执行完成');
  // 分析js引用
  const analysisJS = new AnalysisJS(
    config.cwd || process.cwd(),
    config.options,
  );

  const result = await analysisJS.analysis();

  diskCache.writeFileSync('result.json', JSON.stringify(result));
  diskCache.writeFileSync(
    'unused.json',
    JSON.stringify([...analysisJS.unUsedFiles]),
  );

  console.timeEnd('程序执行完成');
}

export default main;
