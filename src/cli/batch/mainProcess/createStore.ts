import {
  configureStore,
  createListenerMiddleware,
  type ListenerMiddlewareInstance,
  type Store,
} from "@reduxjs/toolkit";
import workerIdReducer, { initialState as workerIdInitialState } from "./workerIdReducer.js";
import workResultsReducer, { initialState as workResultsInitialState } from "./workResults.js";

export function createStore(): { listenerMiddleware: ListenerMiddlewareInstance; store: Store } {
  const listenerMiddleware = createListenerMiddleware();
  const store = configureStore({
    preloadedState: {
      workerId: workerIdInitialState,
      workResults: workResultsInitialState,
    },
    reducer: {
      workerId: workerIdReducer,
      workResults: workResultsReducer,
    },
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({ serializableCheck: false }).prepend(
        listenerMiddleware.middleware
      );
    },
  });

  return { listenerMiddleware, store };
}
