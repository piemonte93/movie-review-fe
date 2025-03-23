import React from "react";
import ContentScrollList from "../components/ContentScrollList";
import { useContents, useTrendingAll } from "../hooks/useContents";
import { useAuth } from "../context/AuthContext";

const HomePage: React.FC = () => {
  const { isLoggedIn, user } = useAuth();

  const {
    contents: trendingAllContent,
    loading: trendingAllLoading,
    error: trendingAllError,
  } = useTrendingAll();

  const {
    contents: topRatedContents,
    loading: topRatedLoading,
    error: topRatedError,
  } = useContents("topRated");

  const {
    contents: upcomingContents,
    loading: upcomingLoading,
    error: upcomingError,
  } = useContents("upcoming");

  const {
    contents: nowPlayingContents,
    loading: nowPlayingLoading,
    error: nowPlayingError,
  } = useContents("nowPlaying");

  return (
    <div className="container mx-auto px-5 py-10">
      <h1 className="mb-10 text-3xl font-bold">영화 정보</h1>

      <ContentScrollList
        title="현재 상영작"
        contents={nowPlayingContents}
        loading={nowPlayingLoading}
        error={nowPlayingError}
        category="nowPlaying"
      />

      <ContentScrollList
        title="사이트 HOT 랭킹 (영화/TV)"
        contents={trendingAllContent}
        loading={trendingAllLoading}
        error={trendingAllError}
        category="trendingAll"
      />

      {isLoggedIn && (
        <ContentScrollList
          title={`${user?.username || "사용자"}님의 친구가 보고있는 작품`}
          contents={topRatedContents}
          loading={topRatedLoading}
          error={topRatedError}
          category="topRated"
        />
      )}

      <section className="my-14">
        <h2 className="mb-6 text-2xl font-bold">현재 HOT 코멘트🔥</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[1, 2, 3].map((review) => (
            <div
              key={review}
              className="rounded-lg border border-gray-200 p-5 shadow-sm"
            >
              <p className="mb-3 text-lg font-semibold">
                "
                {review === 1
                  ? "정말 재미있게 봤어요!"
                  : review === 2
                    ? "배우들의 연기가 훌륭했습니다."
                    : "스토리가 탄탄하고 감동적이었습니다."}
                "
              </p>
              <div className="mt-4 flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-300"></div>
                <div className="ml-3">
                  <p className="font-medium">사용자</p>
                  <p className="text-sm text-gray-500">2분 전</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ContentScrollList
        title="공개 예정작"
        contents={upcomingContents}
        loading={upcomingLoading}
        error={upcomingError}
        category="upcoming"
      />
    </div>
  );
};

export default HomePage;
