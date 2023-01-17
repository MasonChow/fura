import Analysis from '../analysis';
import diskCache from '../helper/diskCache';

export interface Config {
  // 分析入口目录 默认 .
  cwd?: string;
  // 配置项
  options?: {
    // 路径别名 例如 {'@/*': 'src/*'}
    alias?: Record<string, string>;
    // 忽略查询的目录
    exclude?: string[];
  };
}

class Main {
  private analysis: Analysis;

  constructor(config: Config) {
    this.analysis = new Analysis(config.cwd || process.cwd(), config.options);
  }

  public async run() {
    await this.analysis.analysis();
    const { id } = this.analysis.getCacheDataByPath(
      '/Users/zhoushunming/Documents/mason/fura/packages/core/src/analysis/analysis.ts',
    );
    const test = await this.analysis.getFileAttrs([id]);
    diskCache.writeFileSync('test.json', JSON.stringify(test));
  }
}

export default Main;
