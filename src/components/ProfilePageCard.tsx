import React from "react";

interface ProfileContentCardProps {
  content: {
    id: number;
    title?: string;
    movieTitle?: string;
    content: string;
    type: string;
    rating?: number;
  };
  className?: string;
}

const ProfilePageCard: React.FC<ProfileContentCardProps> = ({ 
  content, 
  className 
}) => {
  const title = content.title || content.movieTitle || "제목 없음";
  
  return (
    <div className={`p-4 bg-white shadow rounded-lg ${className || ''}`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-700 mb-3">{content.content}</p>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">{content.type}</span>
        {content.rating && (
          <div className="flex items-center">
            <span className="text-yellow-500 mr-1">★</span>
            <span>{content.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePageCard; 