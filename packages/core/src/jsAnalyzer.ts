// // import parser from '@fura/parser';
// import path from 'path';

// const basePath = process.cwd();

// export interface Config {
//   // 入口文件路径 index.ts / index.js / index.tsx / index.jsx
//   root: string;
//   // 执行分析目录
//   targetDir: string;
// }

// function main(config: Config) {
//   const targetDir = path.join(basePath, config.targetDir);
//   const targetDirFilesMap = getDirFilesMap(targetDir);
//   console.log(targetDirFilesMap);
// }

// main({
//   root: 'index.js',
//   targetDir: 'packages',
// });

// export default main;
