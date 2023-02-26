import { WriteFileOptions } from 'fs';
import { fs, path } from './fileReader';

export class DiskCache {
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

  writeFileSync(fileName: string, data: string, options?: WriteFileOptions) {
    const filePath = this.createFilePath(fileName);
    fs.writeFileSync(filePath, data, options);
    return filePath;
  }
}

export default new DiskCache();
