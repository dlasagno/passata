import { BaseColumnDef } from "./types";

type ColumnHelpers<TData, TColumn extends BaseColumnDef<TData>> = {
  accessor: (
    key: keyof TData,
    config: Partial<Omit<TColumn, "key">>,
  ) => TColumn;
};

export function createColumnHelpers<
  TData,
  TColumn extends BaseColumnDef<TData>,
>(): ColumnHelpers<TData, TColumn> {
  return {
    accessor(key: keyof TData, config: Partial<Omit<TColumn, "key">>): TColumn {
      return {
        key,
        header: key.toString(),
        cell: (value: unknown, row: TData) => value,
        ...config,
      };
    },
  };
}
