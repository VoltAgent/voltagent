import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useMemo,
} from "react";

// Types for the data
type Stargazer = {
  login: string;
  avatar_url: string;
};

type GitHubStarsData = {
  stars: number | null;
  recent_stargazers: Stargazer[] | null;
};

type GitHubStarsState = GitHubStarsData & {
  loading: boolean;
  error: Error | null;
};

// API Endpoint
const API_ENDPOINT = "https://love.voltagent.dev/api/love";

// Create the context with a default value
const GitHubStarsContext = createContext<GitHubStarsState | undefined>(
  undefined,
);

// Create the provider component
type GitHubStarsProviderProps = {
  children: ReactNode;
};

export const GitHubStarsProvider = ({ children }: GitHubStarsProviderProps) => {
  const [starsData, setStarsData] = useState<GitHubStarsData>({
    stars: null,
    recent_stargazers: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
          // Try to parse error from response body
          let errorMsg = `Error fetching GitHub stars: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData && (errorData.error || errorData.message)) {
              errorMsg += ` - ${errorData.error || errorData.message}`;
            }
          } catch (e) {
            /* Ignore if body isn't JSON */
          }
          throw new Error(errorMsg);
        }
        const data: GitHubStarsData = await response.json();

        // Basic validation of the received data
        if (
          typeof data.stars !== "number" ||
          !Array.isArray(data.recent_stargazers)
        ) {
          // Allow null for recent_stargazers if API returned it that way (e.g., error fetching)
          if (data.recent_stargazers !== null) {
            throw new Error("Invalid data format received from API");
          }
        }

        setStarsData({
          stars: data.stars,
          // Ensure stargazers is always an array or null
          recent_stargazers: Array.isArray(data.recent_stargazers)
            ? data.recent_stargazers
            : null,
        });
      } catch (err) {
        console.error("GitHubStarsContext fetch error:", err);
        setError(
          err instanceof Error ? err : new Error("An unknown error occurred"),
        );
        setStarsData({ stars: null, recent_stargazers: null }); // Reset data on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Consider adding a timer to refetch data periodically if needed
    // const intervalId = setInterval(fetchData, 60 * 60 * 1000); // e.g., every hour
    // return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      ...starsData,
      loading,
      error,
    }),
    [starsData, loading, error],
  );

  return (
    <GitHubStarsContext.Provider value={value}>
      {children}
    </GitHubStarsContext.Provider>
  );
};

// Create the custom hook for consuming the context
export const useGitHubStars = (): GitHubStarsState => {
  const context = useContext(GitHubStarsContext);
  if (context === undefined) {
    throw new Error("useGitHubStars must be used within a GitHubStarsProvider");
  }
  return context;
};
