export type ApiExt = {
  [key: string]: (...args: any[]) => any;
};

export type TableExt<
  TData,
  TKeys extends string = string,
  TState extends object = {},
  TColumnExt extends object = {},
  TRowExt extends object = {},
  TTableApi extends ApiExt = {},
  TColumnApi extends ApiExt = {},
  TRowApi extends ApiExt = {},
> = Record<TKeys, {
  stateExt: TState;
  columnExt: TColumnExt;
  rowExt: TRowExt;
  tableApi: TTableApi;
  columnApi: TColumnApi;
  rowApi: TRowApi;
}>;

export type Column<TData, TExt extends TableExt<TData>> = {
  id: string;
  Header: () => React.ReactNode;
  Cell: (props: { row: Row<TData> }) => React.ReactNode;
};

export type Row<TData, TExt extends TableExt<TData>> = {
  id: string;
  index: number;
  original: TData;
} & TExt["rowApi"];

export type Table<TData> = {
  state: {};
  columns: Column<TData>[];
  rows: Row<TData>[];
};
