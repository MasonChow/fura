import path from 'path';
import * as utils from './utils';
import AnalysisJS from './analysis/js';

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
  };
}

function main(config: Config) {
  let targetDir = config.targetDir;

  if (config.rootPath) {
    targetDir = path.join(config.rootPath || '.', config.targetDir);
  }
  // 目标文件map
  const targetDirFilesMap = utils.getDirFilesMap(targetDir);

  const analysisJS = new AnalysisJS();

  [...targetDirFilesMap.keys()].forEach((key) => {
    // 解析JS
    if (utils.isJsTypeFile(key)) {
      const file = targetDirFilesMap.get(key)!;
      analysisJS.analysis(file, config.options);
    }
  });

  console.log(analysisJS.analysisResultData);
}

main({
  targetDir: '/Users/zhoushunming/Documents/sc/shopline-post-center/src',
  options: {
    alias: {
      '@': './',
    },
  },
});

export default main;
