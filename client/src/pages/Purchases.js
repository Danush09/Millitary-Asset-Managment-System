import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    TextField,
    Grid,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress
} from '@mui/material';
import { Add as AddIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';

const Purchases = () => {
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [formData, setFormData] = useState({
        assetName: '',
        quantity: '',
        unitPrice: '',
        supplier: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: ''
    });

    const equipmentTypes = [
        'Vehicles',
        'Weapons',
        'Ammunition',
        'Communication Equipment',
        'Medical Supplies'
    ];

    const fetchPurchases = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/purchases');
            setPurchases(response.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch purchases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    const handleOpenDialog = (purchase = null) => {
        if (purchase) {
            setFormData({
                assetName: purchase.assetName,
                quantity: purchase.quantity,
                unitPrice: purchase.unitPrice,
                supplier: purchase.supplier,
                purchaseDate: purchase.purchaseDate,
                status: purchase.status,
                notes: purchase.notes
            });
            setSelectedPurchase(purchase);
        } else {
            setFormData({
                assetName: '',
                quantity: '',
                unitPrice: '',
                supplier: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                notes: ''
            });
            setSelectedPurchase(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedPurchase(null);
        setFormData({
            assetName: '',
            quantity: '',
            unitPrice: '',
            supplier: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            notes: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedPurchase) {
                await axios.put(`/purchases/${selectedPurchase._id}`, formData);
            } else {
                await axios.post('/purchases', formData);
            }
            fetchPurchases();
            handleCloseDialog();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save purchase');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Asset Purchases
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenDialog()}
                >
                    New Purchase
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Asset Name</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Unit Price</TableCell>
                            <TableCell>Total</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell>Purchase Date</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {purchases.map((purchase) => (
                            <TableRow key={purchase._id}>
                                <TableCell>{purchase.assetName}</TableCell>
                                <TableCell>{purchase.quantity}</TableCell>
                                <TableCell>${purchase.unitPrice}</TableCell>
                                <TableCell>${purchase.quantity * purchase.unitPrice}</TableCell>
                                <TableCell>{purchase.supplier}</TableCell>
                                <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                                <TableCell>{purchase.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>
                    {selectedPurchase ? 'Edit Purchase' : 'New Purchase'}
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            label="Asset Name"
                            name="assetName"
                            value={formData.assetName}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Quantity"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Unit Price"
                            name="unitPrice"
                            type="number"
                            value={formData.unitPrice}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Supplier"
                            name="supplier"
                            value={formData.supplier}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Purchase Date"
                            name="purchaseDate"
                            type="date"
                            value={formData.purchaseDate}
                            onChange={handleChange}
                            margin="normal"
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="approved">Approved</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            margin="normal"
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedPurchase ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Purchases; 