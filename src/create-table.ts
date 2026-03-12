import { useMemo, useReducer, useRef } from "react";

import type {
  BaseColumnDef,
  Header,
  MergeApis,
  MergeColumnExts,
  MergeStates,
  MiddlewareState,
  Row,
  TableMiddleware,
} from "./types";

type MiddlewareUpdater<TState extends MiddlewareState> =
  | Partial<TState>
  | ((prev: TState) => Partial<TState>);

type Action<TState extends MiddlewareState> = {
  middlewareId: string;
  payload: Partial<TState>;
};

type RowPipelineCache<TData> = {
  inputRows: Row<TData>[];
  columnsRef: readonly BaseColumnDef<TData>[];
  stateSlice: unknown;
  outputRows: Row<TData>[];
};

export function createTable<const TMiddlewares extends readonly unknown[]>(
  ...middlewares: TMiddlewares
) {
  type ColumnExt = MergeColumnExts<TMiddlewares>;
  type State = MergeStates<TMiddlewares> & MiddlewareState;
  type Api = MergeApis<TMiddlewares>;
  type GenericColumn = BaseColumnDef<Record<string, unknown>> &
    Record<string, unknown>;
  const runtimeMiddlewares = middlewares as readonly TableMiddleware[];
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
    defineColumns<TData>(columns: (BaseColumnDef<TData> & ColumnExt)[]) {
      return columns;
    },
    useTable<TData>(options: {
      data: TData[];
      columns: (BaseColumnDef<TData> & ColumnExt)[];
      state?: Partial<State>;
      onStateChange?: (state: State) => void;
    }) {
      const initialState: State = {
        ...combinedInitialState,
        ...(options.state ?? {}),
      };

      const [internalState, dispatch] = useReducer(reducer, initialState);
      const rowPipelineCacheRef = useRef(
        new Map<string, RowPipelineCache<TData>>(),
      );
      const headersCacheRef = useRef<{
        columnsRef: (BaseColumnDef<TData> & ColumnExt)[];
        middlewareSlices: unknown[];
        value: Header<TData, BaseColumnDef<TData> & ColumnExt>[];
      } | null>(null);

      const state = useMemo<State>(
        () => ({ ...internalState, ...(options.state ?? {}) }),
        [internalState, options.state],
      );

      const setState = <TMiddlewareState extends MiddlewareState>(
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

          const next = processRows(
            result as Row<Record<string, unknown>>[],
            state,
            columnsRef as unknown as GenericColumn[],
          ) as Row<TData>[];

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

      const headers: Header<TData, BaseColumnDef<TData> & ColumnExt>[] =
        useMemo(() => {
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
                ...(mw.headerProps?.(
                  column as unknown as GenericColumn,
                  state,
                ) ?? {}),
              }),
              {} as Record<string, unknown>,
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
                | Partial<MiddlewareState>
                | ((prev: MiddlewareState) => Partial<MiddlewareState>),
            ) => setState(mw.id, updater),
            { rowCount: options.data.length },
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
