/**
 * @module 输出结果模块
 */

import diskCache from '../../helper/diskCache';
import { conversionToMedia, flowChats } from '../../helper/mermaid';
import { CoreActionReturnType } from '../../core';

export async function mermaid(
  data: CoreActionReturnType['getCommentRelation'],
) {
  const params: flowChats.CreateFlowchartsData = {
    links: [],
    itemMap: {},
  };

  function loop(item: typeof data) {
    if (!item || item.type !== 'ts') {
      return;
    }

    const { id, next, ...itemInfo } = item;

    if (!params.itemMap[id]) {
      params.itemMap[id] = {
        name: itemInfo.attr?.name || itemInfo.name,
      };
    }

    next?.forEach((n) => {
      params.links.push([String(id), String(n.id)]);
      loop(n);
    });
  }

  loop(data);

  const res = await conversionToMedia(
    flowChats.createFlowcharts(params),
    'svg',
  );

  return diskCache.writeFileSync('./comment-relation.svg', String(res));
}
