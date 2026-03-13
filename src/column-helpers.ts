import {
  type AnyColumnDef,
  type BaseColumnDef,
  type ColumnDef,
  type Prettify,
  type RowData,
  type StringKeyOf,
} from "./types";

type ColumnDefConfig<
  TData extends RowData,
  TColumnExt extends object,
  TKey extends StringKeyOf<TData>,
  TPrefilledKey extends keyof ColumnDef<TData, TColumnExt, TKey>,
> = Prettify<
  Omit<ColumnDef<TData, TColumnExt, TKey>, TPrefilledKey> &
    Partial<Pick<ColumnDef<TData, TColumnExt, TKey>, TPrefilledKey>>
>;

export function createDefineColumns<TColumnExt extends object>() {
  type ColumnHelpers<TData extends RowData> = {
    accessor: <TKey extends StringKeyOf<TData>>(
      key: TKey,
      config: ColumnDefConfig<TData, TColumnExt, TKey, "key" | "cell">,
    ) => ColumnDef<TData, TColumnExt, TKey>;
  };

  return function defineColumns<
    TData extends RowData,
    const TColumns extends readonly AnyColumnDef<
      TData,
      TColumnExt
    >[] = readonly AnyColumnDef<TData, TColumnExt>[],
  >(
    columns: (
      helpers: ColumnHelpers<TData>,
    ) => TColumns,
  ): TColumns {
    return columns({
      accessor<TKey extends StringKeyOf<TData>>(
        key: TKey,
        config: ColumnDefConfig<TData, TColumnExt, TKey, "key" | "cell">,
      ) {
        const baseColumn: Pick<BaseColumnDef<TData, TKey>, "key" | "cell"> = {
          key,
          // Default rendering should always be React-renderable.
          cell: (value) => String(value),
        };

        return {
          ...baseColumn,
          ...config,
        } as ColumnDef<TData, TColumnExt, TKey>;
      },
    });
  };
}
