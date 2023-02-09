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
    const { entry, include } = deadCode;
    const unusedDeps = await instance.getUnusedDeps(entry[0], { include });
    console.log(unusedDeps);
  }
}

export default run;
