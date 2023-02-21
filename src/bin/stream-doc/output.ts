/**
 * @module 输出结果模块
 */

import diskCache from '../../helper/diskCache';
import { conversionToMedia, flowChats } from '../../helper/mermaid';
import { CoreActionReturnType } from '../../core';

export async function mermaid(data: CoreActionReturnType['getFileRelation']) {
  const rootFile = data.id;
  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  function loop(item: typeof data) {
    if (!item || item.type !== 'ts') {
      return;
    }

    const { id, prev, next, ...itemInfo } = item;

    if (!params.itemMap[id]) {
      params.itemMap[id] = {
        name: [
          `${itemInfo.attr?.name || itemInfo.name}`,
          id === rootFile && '代码变更',
        ].join('-'),
        type: id === rootFile ? 'circle' : undefined,
      };
    }

    prev?.forEach((n) => {
      params.links.push([String(n.id), String(id)]);
      loop(n);
    });

    next?.forEach((n) => {
      params.links.push([
        String(id),
        String(n.id),
        {
          text: '影响',
          type: 'normal',
        },
      ]);
      loop(n);
    });
  }

  loop(data);

  const res = await conversionToMedia(
    flowChats.createFlowcharts(params),
    'svg',
  );

  return diskCache.writeFileSync('./stream-doc.svg', String(res));
}
