export interface Content {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language?: string;
  original_title?: string;
  original_name?: string;
  media_type?: "movie" | "tv";
}

export interface ContentResponse {
  page: number;
  results: Content[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface ContentDetail {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  posterPath?: string;
  poster_path?: string;
  backdropPath?: string;
  backdrop_path?: string;
  releaseDate?: string;
  release_date?: string;
  first_air_date?: string;
  firstAirDate?: string;
  voteAverage?: number;
  vote_average?: number;
  voteCount?: number;
  vote_count?: number;
  genres?: Genre[];
  runtime?: number;
  status?: string;
  tagline?: string;
  originalLanguage?: string;
  original_language?: string;
  originalTitle?: string;
  original_title?: string;
  original_name?: string;
  originalName?: string;
  popularity?: number;
  adult?: boolean;
  video?: boolean;
  number_of_seasons?: number;
  numberOfSeasons?: number;
  number_of_episodes?: number;
  numberOfEpisodes?: number;
  production_companies?: ProductionCompany[];
  productionCompanies?: ProductionCompany[];
}

export interface ProductionCompany {
  id: number;
  name: string;
  logoPath: string;
  originCountry: string;
}

export interface ReviewResponse {
  id: number;
  page: number;
  results: Review[];
  total_pages: number;
  total_results: number;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  avatar_path?: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface VideoResponse {
  id: number;
  results: Video[];
}
