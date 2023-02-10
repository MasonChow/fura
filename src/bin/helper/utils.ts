/**
 * @module cli工具类
 */

import { isAbsolute, join } from 'path';
import fs from 'fs';
// import rc from 'rc';
import { Config } from './type';

/**
 * @function 获取运行目录
 * @description 参考自 https://github.com/umijs/umi/blob/870bfb9a84e1ef59f9c8b048923d185c55e56047/packages/umi/src/service/cwd.ts
 */
export function getCwd() {
  const cwd = process.cwd();
  const appRoot = process.env.DEBUG_APP_ROOT;
  if (appRoot) {
    return isAbsolute(appRoot) ? appRoot : join(cwd, appRoot);
  }
  return cwd;
}

/**
 * @function 获取运行配置文件地址
 */
export function getConfigPath(path?: string) {
  if (!path) {
    return getCwd();
  }

  return isAbsolute(path) ? path : join(getCwd(), path);
}

/**
 * @function 获取运行配置文件
 */
export function getConfig(path?: string) {
  let furaConfig: Config;

  // 指定路径则使用指定路径的配置
  if (path) {
    furaConfig = JSON.parse(fs.readFileSync(getConfigPath(path)).toString());
  }
  // 否则就取项目默认的.furarc配置文件
  else {
    // const rcConfig = rc('fura');
    // const { _, configs, config, ...othersConfig } = rcConfig;
    try {
      furaConfig = JSON.parse(
        fs.readFileSync(getConfigPath('.furarc')).toString(),
      );
    } catch (error) {
      throw new Error('找不到对应配置文件', { cause: error });
    }
  }

  if (!furaConfig) {
    throw new Error('找不到对应配置文件');
  }

  return function getByKey<
    T extends keyof Config = keyof Config,
    R extends boolean = false,
  >(key: T, required?: R): R extends true ? Required<Config>[T] : Config[T] {
    const value = furaConfig[key];

    if (!value && required) {
      throw new Error(`找不到${key}对应的配置`);
    }

    // 暂时没想到解法，先忽略掉
    // @ts-ignore
    return value;
  };
}
