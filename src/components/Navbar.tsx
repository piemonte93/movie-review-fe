import React from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaBell, FaUser } from 'react-icons/fa';

const Navbar: React.FC = () => {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <div className="text-xl font-bold">
            <Link to="/">
              MovieSocial
            </Link>
          </div>

          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              <li>
                <Link to="/" className="hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-blue-600">
                  Movie
                </Link>
              </li>
              <li>
                <Link to="/tv-shows" className="hover:text-blue-600">
                  TV Show
                </Link>
              </li>
              <li>
                <Link to="/community" className="hover:text-blue-600">
                  Community
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-40 rounded-full border border-gray-300 py-1 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none md:w-60"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
          </div>

          <button className="rounded-full p-2 hover:bg-gray-100">
            <FaBell />
          </button>

          <button className="rounded-full p-2 hover:bg-gray-100">
            <FaUser />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
