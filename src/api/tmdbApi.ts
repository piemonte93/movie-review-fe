import axios from 'axios';
import { MovieResponse } from '../types/movie';

// This will be replaced by our backend endpoint
const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = 'dummy-key'; // We'll use our backend for actual calls

// This service is just for reference - our actual API calls will go through our Spring backend
export const tmdbApi = {
  getTrendingMovies: async (): Promise<MovieResponse> => {
    const response = await axios.get(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
    return response.data;
  },

  getTopRatedMovies: async (): Promise<MovieResponse> => {
    const response = await axios.get(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`);
    return response.data;
  },

  getUpcomingMovies: async (): Promise<MovieResponse> => {
    const response = await axios.get(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}`);
    return response.data;
  },

  getMovieDetails: async (id: number) => {
    const response = await axios.get(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
    return response.data;
  },

  getMovieReviews: async (id: number) => {
    const response = await axios.get(`${BASE_URL}/movie/${id}/reviews?api_key=${API_KEY}`);
    return response.data;
  }
};
