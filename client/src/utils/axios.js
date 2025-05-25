import axios from 'axios';

const instance = axios.create({
    baseURL: 'https://millitary-asset-managment-system.onrender.com/api',
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});


// Add a request interceptor to add the auth token to requests
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle common errors
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default instance; 
