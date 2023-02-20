/**
 * @module 输出结果模块
 */

import diskCache from '../../helper/diskCache';
import { replaceSpecialSymbolStr } from '../../helper/utils';
import { conversionToMedia, flowChats } from '../../helper/mermaid';
import { CoreActionReturnType } from '../../core';

export async function mermaid(
  data: CoreActionReturnType['getCommentRelation'],
) {
  const map = new Map<number, any>();
  const relations = new Set<`${number}-->${number};`>();

  function loop(item: typeof data) {
    if (!item || item.type !== 'ts') {
      return;
    }

    const { id, next, ...itemInfo } = item;

    if (!map.get(id)) {
      map.set(id, itemInfo);
    }

    next?.forEach((n) => {
      relations.add(`${id}-->${n.id};`);
      loop(n);
    });
  }

  loop(data);

  const content = `
    graph LR;
      ${Object.entries(Object.fromEntries(map))
        .map(([k, v]) => {
          return `${k}[${replaceSpecialSymbolStr(
            v.attr?.name || v.name || v.path,
          )}];`;
        })
        .join('\n')}
      ${[...relations].join('\n')}
  `;
  const res = await conversionToMedia(content, 'svg');
  return diskCache.writeFileSync('./common.svg', String(res));
}
