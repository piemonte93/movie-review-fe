import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

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
  return (
    <div className="cast-carousel my-8">
      <h2 className="text-2xl font-bold mb-4">출연진</h2>
      <Swiper
        modules={[Navigation]}
        spaceBetween={16}
        slidesPerView={2}
        navigation
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
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={
                  member.profile_path
                    ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                    : "/default-avatar.png"
                }
                alt={member.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-gray-600">{member.character}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default CastCarousel;
