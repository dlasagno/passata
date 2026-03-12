import { type ReactNode } from "react";

// ============================================
// Core types
// ============================================

export type Row<TData> = {
  original: TData;
  index: number;
};

export type Header<TData, TColumnDef extends BaseColumnDef<TData>> = {
  column: TColumnDef;
  props: Record<string, unknown>;
};

export type BaseColumnDef<TData> = {
  key: keyof TData & string;
  header: string;
  cell?: (value: unknown, row: TData) => ReactNode;
};

export type TableContext = {
  rowCount: number;
};

// ============================================
// Middleware definition
// ============================================

export type MiddlewareState = Record<string, unknown>;

export type TableMiddleware<
  TData extends Record<string, unknown> = Record<string, unknown>,
  TColumnExt extends Record<string, unknown> = Record<string, unknown>,
  TState extends MiddlewareState = Record<string, unknown>,
  TApi extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  initialState: TState;
  getStateSlice?: (state: TState) => unknown;
  processRows?(
    rows: Row<TData>[],
    state: TState,
    columns: (BaseColumnDef<TData> & TColumnExt)[],
  ): Row<TData>[];
  headerProps?(
    column: BaseColumnDef<TData> & TColumnExt,
    state: TState,
  ): Record<string, unknown>;
  api(
    state: TState,
    setState: (
      updater: Partial<TState> | ((prev: TState) => Partial<TState>),
    ) => void,
    context: TableContext,
  ): TApi;
};

// ============================================
// Type-level helpers to merge middlewares
// ============================================

// Extract extensions from a middleware tuple
type ExtractColumnExt<T> =
  T extends TableMiddleware<infer _D, infer C, infer _S, infer _A>
    ? C
    : Record<string, unknown>;
type ExtractState<T> =
  T extends TableMiddleware<infer _D, infer _C, infer S, infer _A>
    ? S
    : Record<string, unknown>;
type ExtractApi<T> =
  T extends TableMiddleware<infer _D, infer _C, infer _S, infer A>
    ? A
    : Record<string, unknown>;

type MergeOrDefault<T, TDefault extends Record<string, unknown>> = [T] extends [
  never,
]
  ? TDefault
  : UnionToIntersection<T> & TDefault;

// Merge a tuple into intersections
export type MergeColumnExts<T extends readonly unknown[]> = {
  [K in keyof MergeOrDefault<
    ExtractColumnExt<T[number]>,
    Record<string, unknown>
  >]: MergeOrDefault<ExtractColumnExt<T[number]>, Record<string, unknown>>[K];
};

export type MergeStates<T extends readonly unknown[]> = MergeOrDefault<
  ExtractState<T[number]>,
  Record<string, unknown>
>;

export type MergeApis<T extends readonly unknown[]> = MergeOrDefault<
  ExtractApi<T[number]>,
  Record<string, unknown>
>;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
