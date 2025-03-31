import { useState, useEffect } from "react";
import { Content } from "../types/content";
import { backendApi } from "../api/backendApi";

type ContentCategory =
  | "trending"
  | "topRated"
  | "upcoming"
  | "nowPlaying"
  | "trendingAll";

// Sample content posters for development
const SAMPLE_POSTERS = [
  "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
  "/kjFDIlUCJkcpFxYKtE6OsGcAfQQ.jpg",
  "/6LuXaihVIoJ5FeSiFb7CZMtU7du.jpg",
  "/lZ2sOCMCcGaPppaXj0Wiv0S7A8S.jpg",
  "/7dFZJ2ZJJdcmkp05B9NWlqTJ5tq.jpg",
  "/t9m8VrWvY75Iqb3MiNRpnH6hJ8s.jpg",
  "/tRk6SQtMmJHn7JUuqx3JGc6UiQK.jpg",
  "/vQtBLzEQlJPvN1PhxdS7X4EZDiO.jpg",
  "/fJxEWJYbSNIFY0hXwzb8Hycu1S7.jpg",
  "/r0J0Y9axoXVJ9D8CfCNrZUzJrMW.jpg",
];

export const useContents = (category: ContentCategory) => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContents = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;

        // 실제 백엔드 API 호출
        switch (category) {
          case "trending":
            response = await backendApi.getTrendingMovies();
            break;
          case "trendingAll":
            response = await backendApi.getTrendingAll();
            break;
          case "topRated":
            response = await backendApi.getTopRatedMovies();
            break;
          case "upcoming":
            response = await backendApi.getUpcomingMovies();
            break;
          case "nowPlaying":
            response = await backendApi.getNowPlayingMovies();
            break;
          default:
            throw new Error("Unknown category");
        }

        // 응답에서 컨텐츠 목록 가져오기
        setContents(response.results || []);
      } catch (err) {
        console.error("Error fetching contents:", err);
        setError("컨텐츠 정보를 가져오는데 실패했습니다");
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [category]);

  return { contents, loading, error };
};

// Generate different mock data based on category
const getMockContents = (category: ContentCategory): Content[] => {
  return Array(10)
    .fill(null)
    .map((_, index) => {
      // Get a random poster from our samples
      const posterIndex = Math.floor(Math.random() * SAMPLE_POSTERS.length);
      const posterPath = SAMPLE_POSTERS[posterIndex];

      // Common properties
      const content: Content = {
        id:
          index +
          1 +
          (category === "trending"
            ? 100
            : category === "topRated"
              ? 200
              : category === "upcoming"
                ? 300
                : 400),
        title: `${category === "trending" ? "Trending" : category === "topRated" ? "Top Rated" : category === "upcoming" ? "Upcoming" : "Now Playing"} Movie ${index + 1}`,
        poster_path: posterPath,
        backdrop_path: posterPath,
        overview: `This is a mock ${category} content description for development purposes.`,
        release_date: "2024-01-01",
        vote_average: Math.floor(Math.random() * 3) + 7, // Random rating between 7 and 9
        vote_count: Math.floor(Math.random() * 900) + 100, // Random between 100 and 999
        genre_ids: [28, 12, 16],
      };

      return content;
    });
};

// 트렌딩 영화와 TV 프로그램을 함께 가져오는 전용 훅
export const useTrendingAll = () => {
  return useContents("trendingAll");
};
