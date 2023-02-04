/**
 * @module cli工具类
 */

import { isAbsolute, join } from 'path';

/**
 * @function 获取运行目录
 * @description 参考自 https://github.com/umijs/umi/blob/870bfb9a84e1ef59f9c8b048923d185c55e56047/packages/umi/src/service/cwd.ts
 */
export function getCwd() {
  const cwd = process.cwd();
  const appRoot = process.env.APP_ROOT;
  if (appRoot) {
    return isAbsolute(appRoot) ? appRoot : join(cwd, appRoot);
  }
  return cwd;
}
