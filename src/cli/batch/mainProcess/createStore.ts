import {
  configureStore,
  createListenerMiddleware,
  type ListenerMiddlewareInstance,
  type Store,
} from "@reduxjs/toolkit";
import workerIdReducer from "./workerIdReducer.js";

export function createStore(): { listenerMiddleware: ListenerMiddlewareInstance; store: Store } {
  const listenerMiddleware = createListenerMiddleware();
  const store = configureStore({
    reducer: {
      workerId: workerIdReducer,
    },
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({ serializableCheck: false }).prepend(
        listenerMiddleware.middleware
      );
    },
  });

  return { listenerMiddleware, store };
}
