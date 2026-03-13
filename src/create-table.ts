import { useMemo, useReducer, useRef } from "react";

import type {
  AnyColumnDef,
  ColumnDef,
  Header,
  MergeApis,
  MergeColumnExts,
  MergeHeaderProps,
  MergeStates,
  MiddlewareState,
  Row,
  RowData,
  TableMiddleware,
} from "./types";
import { createDefineColumns } from "./column-helpers";

type MiddlewareUpdater<TState extends MiddlewareState> =
  | Partial<TState>
  | ((prev: TState) => Partial<TState>);

type Action<TState extends MiddlewareState> = {
  middlewareId: string;
  payload: Partial<TState>;
};

type RowPipelineCache<TData extends RowData, TColumnExt extends object> = {
  inputRows: Row<TData>[];
  columnsRef: readonly AnyColumnDef<TData, TColumnExt>[];
  stateSlice: unknown;
  outputRows: Row<TData>[];
};

export function createTable<
  const TMiddlewares extends readonly TableMiddleware<any, any, any, any>[]
>(
  ...middlewares: TMiddlewares
) {
  type ColumnExt = MergeColumnExts<TMiddlewares>;
  type State = MergeStates<TMiddlewares>;
  type Api = MergeApis<TMiddlewares>;
  type HeaderProps = MergeHeaderProps<TMiddlewares>;
  type RuntimeMiddleware = TableMiddleware<
    ColumnExt,
    State,
    Record<string, unknown>,
    HeaderProps
  >;
  const runtimeMiddlewares = middlewares as readonly RuntimeMiddleware[];
  const middlewareById = new Map(
    runtimeMiddlewares.map((middleware) => [middleware.id, middleware]),
  );
  const rowMiddlewares = runtimeMiddlewares.filter((mw) =>
    Boolean(mw.processRows),
  );
  const headerMiddlewares = runtimeMiddlewares.filter((mw) =>
    Boolean(mw.headerProps),
  );

  const combinedInitialState = runtimeMiddlewares.reduce<State>(
    (acc, mw) => ({ ...acc, ...mw.initialState }),
    {} as State,
  );

  const reducer = (state: State, action: Action<State>): State => {
    if (!middlewareById.has(action.middlewareId)) return state;
    return { ...state, ...action.payload };
  };

  return {
    defineColumns: createDefineColumns<ColumnExt>(),
    useTable<TData extends RowData>(options: {
      data: TData[];
      columns: readonly AnyColumnDef<TData, ColumnExt>[];
      state?: Partial<State>;
      onStateChange?: (state: State) => void;
    }) {
      const initialState: State = {
        ...combinedInitialState,
        ...(options.state ?? {}),
      };

      const [internalState, dispatch] = useReducer(reducer, initialState);
      const rowPipelineCacheRef = useRef(
        new Map<string, RowPipelineCache<TData, ColumnExt>>(),
      );
      const headersCacheRef = useRef<{
        columnsRef: readonly AnyColumnDef<TData, ColumnExt>[];
        middlewareSlices: unknown[];
        value: Header<TData, AnyColumnDef<TData, ColumnExt>, HeaderProps>[];
      } | null>(null);

      const state = useMemo<State>(
        () => ({ ...internalState, ...(options.state ?? {}) }),
        [internalState, options.state],
      );

      const setState = <TMiddlewareState extends State>(
        middlewareId: string,
        updater: MiddlewareUpdater<TMiddlewareState>,
      ) => {
        const payload =
          typeof updater === "function"
            ? updater(state as TMiddlewareState)
            : updater;

        dispatch({ middlewareId, payload: payload as Partial<State> });
        options.onStateChange?.({ ...state, ...payload });
      };

      // Base rows are recomputed only when `data` changes.
      const baseRows: Row<TData>[] = useMemo(
        () =>
          options.data.map((original, index) => ({
            original,
            index,
          })),
        [options.data],
      );

      // Row pipeline: baseRows → middleware processing
      const rows: Row<TData>[] = useMemo(() => {
        let result: Row<TData>[] = baseRows;
        const columnsRef = options.columns;

        for (const mw of rowMiddlewares) {
          const processRows = mw.processRows;
          if (!processRows) continue;

          const stateSlice = mw.getStateSlice?.(state) ?? state;
          const cached = rowPipelineCacheRef.current.get(mw.id);
          if (
            cached &&
            cached.inputRows === result &&
            cached.columnsRef === columnsRef &&
            Object.is(cached.stateSlice, stateSlice)
          ) {
            result = cached.outputRows;
            continue;
          }

          const next = processRows(result, state, columnsRef);

          rowPipelineCacheRef.current.set(mw.id, {
            inputRows: result,
            columnsRef,
            stateSlice,
            outputRows: next,
          });
          result = next;
        }

        return result;
      }, [baseRows, options.columns, state]);

      const headers: Header<
        TData,
        AnyColumnDef<TData, ColumnExt>,
        HeaderProps
      >[] = useMemo(() => {
        const middlewareSlices = headerMiddlewares.map(
          (mw) => mw.getStateSlice?.(state) ?? state,
        );
        const cached = headersCacheRef.current;
        const canReuse =
          cached &&
          cached.columnsRef === options.columns &&
          cached.middlewareSlices.length === middlewareSlices.length &&
          cached.middlewareSlices.every((slice, index) =>
            Object.is(slice, middlewareSlices[index]),
          );

        if (canReuse) return cached.value;

        const computedHeaders = options.columns.map((column) => {
          const props = headerMiddlewares.reduce(
            (acc, mw) => ({
              ...acc,
              ...(mw.headerProps?.(column, state) ?? {}),
            }),
            {} as HeaderProps,
          );

          return { column, props };
        });

        headersCacheRef.current = {
          columnsRef: options.columns,
          middlewareSlices,
          value: computedHeaders,
        };

        return computedHeaders;
      }, [options.columns, state]);

      const api = runtimeMiddlewares.reduce<Api>(
        (acc, mw) => ({
          ...acc,
          ...mw.api(
            state,
            (
              updater:
                | Partial<State>
                | ((prev: State) => Partial<State>),
            ) => setState(mw.id, updater as MiddlewareUpdater<State>),
            { rowCount: options.data.length, columns: options.columns },
          ),
        }),
        {} as Api,
      );

      return {
        rows,
        headers,
        state,
        ...api,
      };
    },
  };
}
