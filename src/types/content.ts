export interface Content {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  type?: "movie" | "tv";
  genre_ids: number[];
}

export interface TvShow extends Content {
  first_air_date: string;
  name: string;
  origin_country: string[];
  original_language: string;
  type: "tv";
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  url: string;
  avatar_path?: string | null;
}

export interface ContentDetail extends Content {
  tagline?: string;
  runtime?: number;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres?: { id: number; name: string }[];
  production_companies?: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  videos?: { results: Video[] };
  reviews?: { results: Review[] };
  cast?: Cast[];
  crew?: Crew[];
}

export interface ContentResponse {
  page: number;
  results: Content[];
  total_pages: number;
  total_results: number;
}

export interface VideoResponse {
  id: number;
  results: Video[];
}

export interface ReviewResponse {
  id: number;
  page: number;
  results: Review[];
  total_pages: number;
  total_results: number;
}
