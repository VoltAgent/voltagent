import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Layout from "@theme/Layout";
import React, { useState, useEffect } from "react";
import { DotPattern } from "../components/ui/dot-pattern";

// Types for the API response
interface OSSFriend {
  name: string;
  description: string;
  href: string;
}

interface OSSFriendsResponse {
  data: OSSFriend[];
}

// OSS Friend Card Component
const OSSFriendCard = ({ friend }: { friend: OSSFriend }) => {
  return (
    <a
      href={friend.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group p-4 sm:p-5 md:p-6 rounded-lg border border-solid border-white/10 no-underline hover:border-main-emerald transition-colors flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5">
        <span className="landing-xs:text-sm md:text-base landing-lg:text-lg font-semibold leading-tight text-main-emerald overflow-hidden">
          {friend.name}
        </span>
        <ArrowTopRightOnSquareIcon className="h-4 w-4 sm:h-5 sm:w-5 text-main-emerald group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
      </div>

      <p className="text-gray-300 mb-0 text-xs sm:text-sm line-clamp-3 flex-1">
        {friend.description}
      </p>
    </a>
  );
};

export default function OSSFriendsPage() {
  const [friends, setFriends] = useState<OSSFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOSSFriends = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use CORS proxy to bypass CORS restrictions
        const proxyUrl = "https://api.allorigins.win/get?url=";
        const targetUrl = encodeURIComponent(
          "https://formbricks.com/api/oss-friends",
        );

        const response = await fetch(`${proxyUrl}${targetUrl}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch OSS friends: ${response.status}`);
        }

        const proxyData = await response.json();
        const data: OSSFriendsResponse = JSON.parse(proxyData.contents);
        setFriends(data.data);
      } catch (err) {
        console.error("Error fetching OSS friends:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load OSS friends",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOSSFriends();
  }, []);

  return (
    <Layout
      title="OSS Friends"
      description="We love open-source and we are proud to support these amazing projects."
    >
      <main className="flex-1">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        <section className="relative py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <div className="mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-main-emerald">
                Our Open-source Friends
              </h1>
            </div>

            {/* Content */}
            {loading && (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d992]" />
                <p className="mt-4 text-gray-400">
                  Loading our open-source friends...
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-16">
                <p className="text-red-400 mb-4">Error: {error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-[#00d992] text-black rounded-lg hover:bg-[#00d992]/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && friends.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {friends.map((friend, index) => (
                  <OSSFriendCard
                    key={`${friend.name}-${index}`}
                    friend={friend}
                  />
                ))}
              </div>
            )}

            {!loading && !error && friends.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400">No OSS friends found.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
