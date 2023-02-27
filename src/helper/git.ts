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
export function getDiffFiles(params?: { local: string; remote: string }) {
  const res = command(
    `git diff --name-only ${params ? `${params.local} ${params.remote}` : ''}`,
  );
  return res;
}

export default command;
