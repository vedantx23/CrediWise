import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('crediwise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear auth and redirect to login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crediwise_token');
      localStorage.removeItem('crediwise_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
