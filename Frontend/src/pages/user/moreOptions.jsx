import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";

export default function MoreOptions() {
  const navigate = useNavigate();

  // Sidebar state (mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filters state
  const [searchName, setSearchName] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [minRating, setMinRating] = useState(0);

  // Fetch venues from backend
  const { data, isLoading, isError } = useQuery({
    queryKey: ["venues", { page: 1, limit: 50 }],
    queryFn: async () => {
      const res = await axiosInstance.get("/users/venues", {
        params: { page: 1, limit: 50 },
      });
      return res.data?.data;
    },
  });

  const venues = data?.venues || [];

  // Filter venues based on filters
  const filteredVenues = venues.filter((venue) => {
    const matchesName = venue.name
      .toLowerCase()
      .includes(searchName.toLowerCase());
    const matchesSport = selectedSport
      ? venue.sportTypes?.some((sport) =>
          sport.toLowerCase().includes(selectedSport.toLowerCase())
        )
      : true;
    const matchesRating = (venue.rating || 0) >= (minRating || 0);

    return matchesName && matchesSport && matchesRating;
  });

  const pricepevenue = venues.filter((venue) => {
    const pricename = venue.startingPrice;
    const pricename1 = venue.name.toLowerCase();
    
    return (
      pricename1.toLowerCase().includes(searchName.toLowerCase()) &&
      pricename >= (minRating || 0)
    );
    return pricename;
  });
  // Get unique sports for filter dropdown
  const uniqueSports = [
    ...new Set(venues.flatMap((venue) => venue.sportTypes || [])),
  ];

  const ratingOptions = [5, 4.5, 4];

  const clearFilters = () => {
    setSearchName("");
    setSelectedSport("");
    setMinRating(0);
    setIsSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="w-72 bg-white/80 backdrop-blur-sm border border-green-200 rounded-xl p-6 space-y-8 shadow-xl sticky top-4 h-screen overflow-auto hidden md:block" />
        <main className="flex-1 p-8 bg-white/70 backdrop-blur-sm overflow-auto">
          <div className="animate-pulse">
            <div className="h-10 bg-gradient-to-r from-green-200 to-emerald-200 rounded-lg w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border border-green-100 rounded-xl p-6 shadow-lg bg-white/90 backdrop-blur-sm"
                >
                  <div className="h-48 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg mb-4"></div>
                  <div className="h-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg mb-2"></div>
                  <div className="h-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg mb-2"></div>
                  <div className="h-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg mb-4"></div>
                  <div className="h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 items-center justify-center">
        <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-red-100">
          <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Oops! Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't load the venues. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-green-100 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Filters
          </h1>
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open filters"
            className="inline-flex items-center justify-center rounded-xl border border-green-200 px-3 py-2 text-green-700 bg-green-50/50 hover:bg-green-100/70 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="sr-only">Open filters</span>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-40 inset-y-0 left-0 w-80 md:w-72 bg-white/90 backdrop-blur-lg border border-green-200 md:rounded-2xl p-6 space-y-6 shadow-2xl overflow-auto transform transition-all duration-300 ease-out
        ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }
      `}
      >
        {/* Sidebar header (mobile only) */}
        <div className="flex items-center justify-between md:hidden mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Filters
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close filters"
            className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search by Venue Name */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search Venues
          </h2>
          <div className="relative">
            <input
              type="text"
              className="w-full border border-green-200 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-green-50/50 placeholder-green-500 text-green-900 shadow-sm"
              placeholder="Type venue name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <svg
              className="w-4 h-4 text-green-500 absolute left-3 top-1/2 transform -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Filter by Sport Type */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Sport Type
          </h2>
          <select
            className="w-full border border-green-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-green-50/50 text-green-900 shadow-sm"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="">All Sports</option>
            {uniqueSports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>
        </div>

        {/* Ratings - single-select checkboxes */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-green-800 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Minimum Rating
          </h2>
          <div className="space-y-2">
            {ratingOptions.map((rating) => {
              const checked = Number(minRating) === rating;
              return (
                <label
                  key={rating}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                    checked
                      ? "border-green-400 bg-gradient-to-r from-green-100 to-emerald-100 shadow-md"
                      : "border-green-200 bg-white/70 hover:bg-green-50/70"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-green-600 rounded"
                    checked={checked}
                    onChange={() => setMinRating(checked ? 0 : rating)}
                  />
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      checked ? "text-green-800" : "text-green-700"
                    }`}
                  >
                    ⭐ {rating}+
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Clear Filters */}
        <div className="pt-2">
          <button
            onClick={clearFilters}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Clear All Filters
          </button>
        </div>
      </aside>

      {/* Dim background when sidebar open on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Venues List */}
      <main className="flex-1 p-8 bg-white/70 backdrop-blur-sm overflow-auto w-full md:ml-0 mt-12 md:mt-0">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent mb-2">
            Available Venues
          </h1>
          <p className="text-green-600 font-medium">
            {filteredVenues.length} venue
            {filteredVenues.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {filteredVenues.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.674-2.64"
                />
              </svg>
            </div>
            <p className="text-xl text-gray-600 font-medium">
              No venues found matching your filters
            </p>
            <p className="text-gray-500 mt-2">
              Try adjusting your search criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVenues.map((venue) => (
              <div
                key={venue.id}
                className="bg-white/90 backdrop-blur-sm border border-green-100 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col group hover:scale-105 hover:border-green-200"
                onClick={() => navigate(`/venue/${venue.id}`)}
              >
                <div className="relative overflow-hidden rounded-xl mb-4">
                  <img
                    src={venue.photos?.[0] || "/hero1.jpg"}
                    alt={venue.name}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                    <span className="text-yellow-500 font-bold flex items-center gap-1">
                      ⭐ {venue.rating || 0}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold mb-2 text-green-900 group-hover:text-green-700 transition-colors">
                  {venue.name}
                </h2>
                <p className="text-gray-600 mb-2 flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {venue.location}
                </p>
                <p className="text-green-700 font-semibold mb-3 bg-green-50 px-3 py-1 rounded-lg inline-block">
                  {venue.sportTypes?.[0] || "Multiple Sports"}
                </p>
                <p className="mt-auto text-2xl text-green-800 font-bold mb-3">
                  ₹{venue.startingPrice || 0}{" "}
                  <span className="text-sm font-normal text-gray-600">
                    / hour
                  </span>
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/venue/${venue.id}`);
                  }}
                  className="mt-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  Book This Venue
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
