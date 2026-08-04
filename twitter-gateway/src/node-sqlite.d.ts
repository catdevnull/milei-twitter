declare module "node:sqlite" {
  export class StatementSync {
    get(...values: unknown[]): unknown;
    run(...values: unknown[]): unknown;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
