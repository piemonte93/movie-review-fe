import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import defaultProfile from "../assets/default-profile.svg";

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface CastCarouselProps {
  cast: CastMember[];
}

const CastCarousel: React.FC<CastCarouselProps> = ({ cast }) => {
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>(
    {}
  );

  const handleImageError = (memberId: number) => {
    setImageErrors((prev) => ({ ...prev, [memberId]: true }));
  };

  return (
    <div className="cast-carousel my-4">
      <h2 className="text-lg font-bold mb-2">주요 출연진</h2>
      <Swiper
        spaceBetween={8}
        slidesPerView={2}
        breakpoints={{
          640: {
            slidesPerView: 3,
          },
          768: {
            slidesPerView: 4,
          },
          1024: {
            slidesPerView: 5,
          },
        }}
        className="cast-swiper"
      >
        {cast.map((member) => (
          <SwiperSlide key={member.id}>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative w-full pb-[100%] bg-gray-50">
                {!imageErrors[member.id] && member.profile_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                    alt={member.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    onError={() => handleImageError(member.id)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={defaultProfile}
                      alt={member.name}
                      className="w-1/2 h-1/2 object-contain opacity-70"
                    />
                  </div>
                )}
              </div>
              <div className="p-2">
                <h3
                  className="font-semibold text-base truncate"
                  title={member.name}
                >
                  {member.name}
                </h3>
                <p
                  className="text-gray-600 text-sm truncate"
                  title={member.character}
                >
                  {member.character}
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default CastCarousel;
