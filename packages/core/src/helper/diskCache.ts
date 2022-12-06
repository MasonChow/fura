import { WriteFileOptions } from 'fs';
import { fs, path } from './fileReader';

class DiskCache {
  public readonly dirPath: string;

  constructor(root: string = process.cwd()) {
    const dirPath = path.join(root, '.fura');

    try {
      fs.readdirSync(dirPath);
    } catch (error) {
      fs.mkdirSync(dirPath);
    }

    this.dirPath = dirPath;
  }

  createFilePath(filePath: string) {
    return path.join(this.dirPath, filePath);
  }

  writeFileSync(filePath: string, data: string, options?: WriteFileOptions) {
    fs.writeFileSync(this.createFilePath(filePath), data, options);
  }
}

export default new DiskCache();
