import axios from 'axios';

// Create an Axios instance pointing to the API baseline
export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});
