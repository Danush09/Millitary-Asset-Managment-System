import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import assetReducer from './slices/assetSlice';
import transferReducer from './slices/transferSlice';
import assignmentReducer from './slices/assignmentSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        assets: assetReducer,
        transfers: transferReducer,
        assignments: assignmentReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export default store; 