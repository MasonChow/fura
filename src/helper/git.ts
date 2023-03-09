/**
 * @name git命令行操作模块
 */

import execa from 'execa';

/**
 * git命令行操作通用方法
 *
 * @param gitCommand git 命令行
 */
export function command(gitCommand: `git ${string}`) {
  return execa.commandSync(gitCommand).stdout;
}

/**
 * 获取当前hash
 */
export function getHash() {
  return command('git rev-parse --short HEAD');
}

/**
 * 获取当前分支名
 */
export function getBranch() {
  return command('git rev-parse --abbrev-ref HEAD');
}

/**
 * 获取当前项目变更内容
 */
export function getDiffFiles(target: string, local?: string) {
  const res = command(`git diff --name-only ${target} ${local || getBranch()}`);
  return res;
}

/**
 * 获取未提交的文件
 */
export function getStatusFiles() {
  const res = command(`git status -s`);
  const statusFiles = res.split('\n').map((e) => e.trim());
  return statusFiles.map((e) => {
    const [type, fileName] = e.split(' ');

    const result: {
      fileName: string;
      type: 'add' | 'diff' | 'del';
    } = {
      type: 'add',
      fileName,
    };

    if (type === 'M') {
      result.type = 'diff';
    }

    if (type === 'D') {
      result.type = 'del';
    }

    return result;
  });
}

export default command;
