/**
 * @name git命令行操作模块
 */

import execa from 'execa';

export enum EnumGitDiffType {
  M = 'modify',
  D = 'del',
  A = 'add',
  R = 'rename',
}

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

export function checkHasUnCommit() {
  const stdout = command(`git status -s`).trim();

  if (stdout) {
    throw new Error(`存在未提交文件，请先使用git commit提交\n\n${stdout}`);
  }
}

function getTypeFromStdout(stdout: string) {
  const originType = stdout.substring(0, 1);
  const typeMap = new Map<string, EnumGitDiffType>([
    ['M', EnumGitDiffType.M],
    ['D', EnumGitDiffType.D],
    ['A', EnumGitDiffType.A],
    ['R', EnumGitDiffType.R],
  ]);
  const type: EnumGitDiffType | 'unknown' = typeMap.get(originType)
    ? typeMap.get(originType)!
    : 'unknown';
  return type;
}

/**
 * 获取当前项目变更内容
 */
export function getDiffFiles(originBranch: string, fromBranch = '') {
  const res = command(
    `git diff --name-status origin/${originBranch} ${fromBranch}`,
  );
  const statusFiles = res.split('\n');

  return (
    statusFiles
      .filter(Boolean)
      //  获取文件的变更类型
      .map((stdout) => {
        const type = getTypeFromStdout(stdout);
        const [file] = stdout.split(/\s/).reverse();

        return {
          type,
          file,
        };
      })
  );
}

export function checkout(branch: string, withPull?: boolean) {
  command(`git checkout ${branch}`);

  if (withPull) {
    command(`git pull`);
  }
}

/**
 * 检查是否依旧存在未暂存的文件
 * @description 如果存在未暂存的文件会抛出错误
 */
export function checkHasUnStaged() {
  const stdout = command(`git status -s`);
  const files = stdout.split('\n');

  const hasUnStaged = files.some((file) => {
    return !/\s/.test(file.substring(1, 2));
  });

  if (hasUnStaged) {
    throw new Error(
      `存在未暂存的文件，请使用git add添加到暂存区\n\n${files.join('\n')}`,
    );
  }
}

/**
 * 获取未提交的文件
 *
 * @description 调用之前必须要保证文件都添加到暂存区，不如会抛出异常
 */
export function getStatusFiles() {
  checkHasUnStaged();

  const res = command(`git status -s`);
  const statusFiles = res.split('\n');

  return (
    statusFiles
      .filter(Boolean)
      //  获取文件的变更类型
      .map((stdout) => {
        const originType = stdout.substring(0, 1);
        const result = stdout.replace(originType, '').trim();
        const typeMap = new Map<string, EnumGitDiffType>([
          ['M', EnumGitDiffType.M],
          ['D', EnumGitDiffType.D],
          ['A', EnumGitDiffType.A],
          ['R', EnumGitDiffType.R],
        ]);
        // const originType = splitStr[0];
        const type: EnumGitDiffType | 'unknown' = typeMap.get(originType)
          ? typeMap.get(originType)!
          : 'unknown';

        const extra: Record<string, unknown> = {};

        if (type === EnumGitDiffType.R) {
          const [oldFileName, newFileName] = result.split('->');
          extra.oldFileName = oldFileName.trim();
          extra.newFileName = newFileName.trim();
        }

        return { type, result, extra };
      })
  );
}

export default command;
