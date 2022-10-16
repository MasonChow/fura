// alias 路径匹配转换
export function transformAliasPath(
  sourcePath: string,
  alias: Record<string, string>,
) {
  const aliasMap = new Map<RegExp, string>();
  Object.entries(alias).forEach(([key, value]) => {
    const reg = new RegExp(`^${key}(\/|$)`);
    const path = value.endsWith('/') ? value : value + '/';
    aliasMap.set(reg, path);
  });
  const regKeys = [...aliasMap.keys()];

  for (let i = 0; i < regKeys.length; i++) {
    const reg = regKeys[i];

    if (reg.test(sourcePath) && aliasMap.get(reg) !== undefined) {
      return sourcePath.replace(reg, aliasMap.get(reg)!);
    }
  }

  return sourcePath;
}
