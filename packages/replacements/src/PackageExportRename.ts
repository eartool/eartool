export type PackageExportRename = JustRename | JustMoveFile | Full;

export interface Base {
  from: string[];
  to?: string[];
  toFileOrModule?: string;
}

export interface JustRename extends Base {
  to: string[];
}

export interface JustMoveFile extends Base {
  to?: undefined;
  toFileOrModule: string;
}

export interface Full extends Base {
  to: string[];
  toFileOrModule: string;
}
