import path from 'path';
import * as utils from './utils';
import AnalysisJS from './analysis/js';
import fs from 'fs';
import child_process from 'child_process';

export interface Config {
  // 入口文件路径 index.ts / index.js / index.tsx / index.jsx
  // root: string;
  // 执行分析目录
  targetDir: string;
  // 分析入口目录 默认 .
  rootPath?: string;
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
  let targetDir = config.targetDir;

  if (config.rootPath) {
    targetDir = path.join(config.rootPath || '.', config.targetDir);
  }

  // 分析js引用
  const analysisJS = new AnalysisJS(targetDir, config.options);

  setResultData('result.json', analysisJS.analysis());
}

export default main;
