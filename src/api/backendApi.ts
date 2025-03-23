import axios from "axios";
import { MovieResponse } from "../types/movie";

// This will point to our Spring Boot backend
const BASE_URL = "http://localhost:8080/api";

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const backendApi = {
  // Movie endpoints
  getTrendingMovies: async (): Promise<MovieResponse> => {
    const response = await apiClient.get("/movies/trending");
    return response.data;
  },

  getTrendingAll: async (): Promise<MovieResponse> => {
    const response = await apiClient.get("/movies/trending-all");
    return response.data;
  },

  getTopRatedMovies: async (): Promise<MovieResponse> => {
    const response = await apiClient.get("/movies/top-rated");
    return response.data;
  },

  getUpcomingMovies: async (): Promise<MovieResponse> => {
    const response = await apiClient.get("/movies/upcoming");
    return response.data;
  },

  getNowPlayingMovies: async (): Promise<MovieResponse> => {
    const response = await apiClient.get("/movies/now-playing");
    return response.data;
  },

  getMovieDetails: async (id: number) => {
    const response = await apiClient.get(`/movies/${id}`);
    return response.data;
  },

  getMovieReviews: async (id: number) => {
    const response = await apiClient.get(`/movies/${id}/reviews`);
    return response.data;
  },

  // User related endpoints will be added later
};
