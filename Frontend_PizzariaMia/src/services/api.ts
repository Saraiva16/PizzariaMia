import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5210/api', // Adjust if backend runs on a different port
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@PizzariaMia:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
