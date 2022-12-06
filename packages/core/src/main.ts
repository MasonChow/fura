import { path } from './helper/fileReader';
import diskCache from './helper/diskCache';
import AnalysisJS, { AnalysisJSResultType } from './analysis';

export type ResultType = AnalysisJSResultType;

export interface Config {
  // 入口文件路径 index.ts / index.js / index.tsx / index.jsx
  // root: string;
  // 分析入口目录 默认 .
  cwd?: string;
  // 入口文件目录
  entryDir: string;
  // 配置项
  options?: {
    // 路径别名 例如 {'@/*': 'src/*'}
    alias?: Record<string, string>;
    // 忽略查询的目录
    exclude?: string[];
    // 需要执行分析的目录, 默认仅分析src/*
    include?: string[];
  };
}

async function main(config: Config) {
  console.time('程序执行完成');
  let targetDir = config.entryDir;

  if (config.cwd) {
    targetDir = path.join(config.cwd || process.cwd(), config.entryDir);
  }

  // 分析js引用
  const analysisJS = new AnalysisJS(targetDir, config.options);

  const result = await analysisJS.analysis();

  diskCache.writeFileSync('result.json', JSON.stringify(result));
  diskCache.writeFileSync(
    'unused.json',
    JSON.stringify([...analysisJS.unUsedFiles]),
  );

  console.timeEnd('程序执行完成');
}

export default main;
