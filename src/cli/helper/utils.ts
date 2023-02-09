/**
 * @module cli工具类
 */

import { isAbsolute, join } from 'path';
import fs from 'fs';
import rc from 'rc';
import { Config } from './type';

const rcConfig = rc('fura');

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

/**
 * @function 获取运行配置文件地址
 * @description 默认会拿运行目录下的.furarc
 */
export function getConfigPath(path?: string) {
  if (path) {
    return path;
  }

  return join(getCwd(), '.furarc');
}

/**
 * @function 获取运行配置文件
 */
export function getConfig(path?: string): Config {
  if (path) {
    return JSON.parse(fs.readFileSync(getConfigPath(path)).toString());
  }

  const { _, configs, config, ...realConfig } = rcConfig;

  if (realConfig) {
    return realConfig as unknown as Config;
  }

  throw new Error('找不到对应配置文件');
}
