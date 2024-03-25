import {
  configureStore,
  createListenerMiddleware,
  type ListenerMiddlewareInstance,
  type Store,
} from "@reduxjs/toolkit";

import workResultsReducer, { initialState as workResultsInitialState } from "./workResults.js";

export function createStore(): { listenerMiddleware: ListenerMiddlewareInstance; store: Store } {
  const listenerMiddleware = createListenerMiddleware();
  const store = configureStore({
    preloadedState: {
      workResults: workResultsInitialState,
    },
    reducer: {
      workResults: workResultsReducer,
    },
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({ serializableCheck: false }).prepend(
        listenerMiddleware.middleware,
      );
    },
  });

  return { listenerMiddleware, store };
}
