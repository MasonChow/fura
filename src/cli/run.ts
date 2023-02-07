import core from '../core';
import * as utils from './helper/utils';

export async function run(target: string, configPath?: string) {
  const config = utils.getConfig(configPath);

  const { alias, exclude, deadCode } = config;

  const instance = await core({
    cwd: target,
    options: {
      alias,
      exclude,
    },
  });

  // const result = {
  //   ...(await instance.getProjectFiles()),
  // };

  if (deadCode !== undefined) {
    const unusedDeps = await instance.getUnusedDeps(deadCode.entry[0]);

    console.log(unusedDeps);
  }
}

export default run;
