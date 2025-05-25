import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axios';

// Async thunks
export const fetchAssignments = createAsyncThunk(
    'assignments/fetchAssignments',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/assignments');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: 'Failed to fetch assignments' });
        }
    }
);

const initialState = {
    assignments: [],
    loading: false,
    error: null
};

const assignmentSlice = createSlice({
    name: 'assignments',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAssignments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAssignments.fulfilled, (state, action) => {
                state.loading = false;
                state.assignments = action.payload;
            })
            .addCase(fetchAssignments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to fetch assignments';
            });
    }
});

export const { clearError } = assignmentSlice.actions;
export default assignmentSlice.reducer; 