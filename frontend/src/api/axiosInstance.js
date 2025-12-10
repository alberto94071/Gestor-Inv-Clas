// src/api/axiosInstance.js
import axios from 'axios';

// Define la URL base de tu backend de Express
const API = axios.create({
  // 🛑 CRÍTICO: Asegúrate de que esta URL coincida con la de tu servidor Express
  // Tu backend está corriendo en http://localhost:3000
  baseURL: 'http://localhost:3000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default API;