export type GetObjectType<T extends Object, K extends keyof T> = Required<T>[K];
