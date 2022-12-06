import { FileType } from './utils';

export interface Table {
  file: {
    id: number;
    name: string;
    path: string;
    size: number;
    type: FileType;
  };

  dir: {
    id: number;
    name: string;
    path: string;
    depth: number;
  };

  dir_file_relation: {
    id: number;
    dir_id: number;
    file_id: number;
  };
}
