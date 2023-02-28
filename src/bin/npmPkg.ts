/**
 * 通过注释生成关联文档内容
 *
 * @name 生成NPM依赖关联内容
 * @group module
 */
// import lodash from 'lodash';
import ora from 'ora';
import { CommonOptions } from './helper/type';
import core from '../core';
import {
  // conversionToMedia,
  conversionOriginUrl,
  flowChats,
} from '../helper/mermaid';
import diskCache from '../helper/diskCache';

async function npmPkg(
  target: string,
  npmPkgs: string[],
  options: CommonOptions,
) {
  if (!npmPkgs.length) {
    console.error('缺失指定npm包');
    return;
  }

  const spinner = ora('分析项目代码').start();
  const instance = await core({
    cwd: target,
    options,
  });
  spinner.text = '解析文件关系';

  const { npmPkgMap, fileInfoMap, relations } =
    await instance.getRelationFileCommentByNpmPkgs(npmPkgs);

  spinner.text = '构建关系链路';

  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  relations.forEach((rel) => {
    const { from, to, fromIdType } = rel;
    const toData = fileInfoMap.get(to);

    params.itemMap[to] = {
      name: toData?.attr?.name || toData?.name || 'unknown',
    };

    if (fromIdType === 'npmPkg') {
      const npmPkgData = npmPkgMap.get(from)!;
      const fromId = `npmPkg_${npmPkgData.id}`;
      params.itemMap[fromId] = {
        name: `${npmPkgData.name}-变更`,
        type: 'circle',
      };
      params.links.push([fromId, String(to), { text: '直接影响' }]);
    } else {
      const fromFileData = fileInfoMap.get(from);
      const fromId = String(from);
      params.itemMap[from] = {
        name: fromFileData?.attr?.name || fromFileData?.name || 'unknown',
      };
      params.links.push([fromId, String(to), { text: '引用' }]);
    }
  });

  spinner.text = '生成图例';

  const flowChatsContent = flowChats.createFlowcharts(params);

  // const svgFile = await conversionToMedia(flowChatsContent, 'svg');
  const url = conversionOriginUrl(flowChatsContent);

  spinner.text = '写入本地缓存';

  const cachePath = diskCache.writeFileSync(
    './npm-pkg-relation.mmd',
    String(flowChatsContent),
  );

  spinner.stop();

  console.info('生成结果:', url);
  console.info('结果mermaid内容:', cachePath);
}

export default npmPkg;
