import { type ReactNode } from "react";

// ============================================
// Core types
// ============================================

export type RowData = object;

type EmptyObject = Record<never, never>;

export type StringKeyOf<TData> = Extract<keyof TData, string>;

export type Row<TData> = {
  original: TData;
  index: number;
};

export type Header<
  TData extends RowData,
  TColumnDef extends BaseColumnDef<TData>,
  THeaderProps extends object = EmptyObject,
> = {
  column: TColumnDef;
  props: Prettify<THeaderProps>;
};

export type BaseColumnDef<
  TData extends RowData,
  TKey extends StringKeyOf<TData> = StringKeyOf<TData>,
> = {
  key: TKey;
  header: ReactNode;
  cell?: (value: TData[TKey], row: TData) => ReactNode;
};

export type ColumnDef<
  TData extends RowData,
  TColumnExt extends object = EmptyObject,
  TKey extends StringKeyOf<TData> = StringKeyOf<TData>,
> = Prettify<
  BaseColumnDef<TData, TKey> & TColumnExt
>;

export type AnyColumnDef<
  TData extends RowData,
  TColumnExt extends object = EmptyObject,
> = {
  [K in StringKeyOf<TData>]: ColumnDef<TData, TColumnExt, K>;
}[StringKeyOf<TData>];

export type TableContext<
  TData extends RowData = RowData,
  TColumnExt extends object = EmptyObject,
> = {
  rowCount: number;
  columns: readonly AnyColumnDef<TData, TColumnExt>[];
};

// ============================================
// Middleware definition
// ============================================

export type MiddlewareState = Record<string, unknown>;

export type TableMiddleware<
  TColumnExt extends object = EmptyObject,
  TState extends MiddlewareState = EmptyObject,
  TApi extends object = EmptyObject,
  THeaderProps extends object = EmptyObject,
> = {
  id: string;
  initialState: TState;
  getStateSlice?: (state: TState) => unknown;
  processRows?<TData extends RowData>(
    rows: Row<TData>[],
    state: TState,
    columns: readonly AnyColumnDef<TData, TColumnExt>[],
  ): Row<TData>[];
  headerProps?<TData extends RowData>(
    column: AnyColumnDef<TData, TColumnExt>,
    state: TState,
  ): THeaderProps;
  api<TData extends RowData>(
    state: TState,
    setState: (
      updater: Partial<TState> | ((prev: TState) => Partial<TState>),
    ) => void,
    context: TableContext<TData, TColumnExt>,
  ): TApi;
};

// ============================================
// Type-level helpers to merge middlewares
// ============================================

// Extract extensions from a middleware tuple
type ExtractColumnExt<T> =
  T extends TableMiddleware<infer C, infer _S, infer _A, infer _H> ? C : never;
type ExtractState<T> =
  T extends TableMiddleware<infer _C, infer S, infer _A, infer _H> ? S : never;
type ExtractApi<T> =
  T extends TableMiddleware<infer _C, infer _S, infer A, infer _H> ? A : never;
type ExtractHeaderProps<T> =
  T extends TableMiddleware<infer _C, infer _S, infer _A, infer H> ? H : never;

type MergeOrDefault<T, TDefault extends object> = [T] extends [
  never,
]
  ? TDefault
  : UnionToIntersection<T> & TDefault;

// Merge a tuple into intersections
export type MergeColumnExts<
  T extends readonly TableMiddleware<any, any, any, any>[],
> = Prettify<
  MergeOrDefault<ExtractColumnExt<T[number]>, EmptyObject>
>;

export type MergeStates<
  T extends readonly TableMiddleware<any, any, any, any>[],
> = MergeOrDefault<ExtractState<T[number]>, EmptyObject> &
  MiddlewareState;

export type MergeApis<
  T extends readonly TableMiddleware<any, any, any, any>[],
> = MergeOrDefault<ExtractApi<T[number]>, EmptyObject>;

export type MergeHeaderProps<
  T extends readonly TableMiddleware<any, any, any, any>[],
> = Prettify<
  MergeOrDefault<ExtractHeaderProps<T[number]>, EmptyObject>
>;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// ============================================
// Type-level helpers
// ============================================

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
