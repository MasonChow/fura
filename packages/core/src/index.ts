import path from 'path';
import AnalysisJS from './analysis/js';
import fs from 'fs';

export interface Config {
  // 入口文件路径 index.ts / index.js / index.tsx / index.jsx
  // root: string;
  // 执行分析目录入口
  entryDir: string;
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

const resultDir = path.join(process.cwd(), '.fura');

try {
  fs.readdirSync(resultDir);
} catch (error) {
  fs.mkdirSync(resultDir);
}

function setResultData<T extends Record<string, any> = any>(
  filename: string,
  data: T,
) {
  fs.writeFileSync(path.join(resultDir, filename), JSON.stringify(data));
}

function main(config: Config) {
  let targetDir = config.entryDir;

  if (config.cwd) {
    targetDir = path.join(config.cwd || process.cwd(), config.entryDir);
  }

  // 分析js引用
  const analysisJS = new AnalysisJS(targetDir, config.options);

  setResultData('result.json', analysisJS.analysis());
}

export default main;
