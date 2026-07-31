import axios from 'axios';

// Get API URL from env variable, validating it starts with http, otherwise fallback to local backend
const envUrl = import.meta.env.VITE_API_URL;
const BASE_URL = (envUrl && envUrl.startsWith('http')) ? envUrl : 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;
