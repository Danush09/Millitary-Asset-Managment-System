import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axios';

// Async thunks
export const fetchTransfers = createAsyncThunk(
    'transfers/fetchTransfers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/transfers');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: 'Failed to fetch transfers' });
        }
    }
);

const initialState = {
    transfers: [],
    loading: false,
    error: null
};

const transferSlice = createSlice({
    name: 'transfers',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTransfers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTransfers.fulfilled, (state, action) => {
                state.loading = false;
                state.transfers = action.payload;
            })
            .addCase(fetchTransfers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to fetch transfers';
            });
    }
});

export const { clearError } = transferSlice.actions;
export default transferSlice.reducer; 