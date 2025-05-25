import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axios';

// Async thunks
export const fetchAssets = createAsyncThunk(
    'assets/fetchAssets',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/assets');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: 'Failed to fetch assets' });
        }
    }
);

const initialState = {
    assets: [],
    loading: false,
    error: null
};

const assetSlice = createSlice({
    name: 'assets',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAssets.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAssets.fulfilled, (state, action) => {
                state.loading = false;
                state.assets = action.payload;
            })
            .addCase(fetchAssets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to fetch assets';
            });
    }
});

export const { clearError } = assetSlice.actions;
export default assetSlice.reducer; 