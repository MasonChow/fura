import AnalysisJS from '../analysis';

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
  private analysisJS: AnalysisJS;

  constructor(config: Config) {
    this.analysisJS = new AnalysisJS(
      config.cwd || process.cwd(),
      config.options,
    );
  }

  public async run() {
    await this.analysisJS.analysis();
  }

  // public async getUnusedFiles() {

  // }
}

export default Main;
