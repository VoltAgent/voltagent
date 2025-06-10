import {
  type FC,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  login: (id: string) => void;
  logout: () => void;
  isLoading: boolean; // To handle initial loading check
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading

  // Check local storage on initial mount and URL parameters
  useEffect(() => {
    try {
      // First check URL parameters for redirect from login flow
      const urlParams = new URLSearchParams(window.location.search);
      const loggedInUser = urlParams.get("loggedInUser");

      if (loggedInUser) {
        console.log("User logged in via redirect:", loggedInUser);
        // Save to localStorage and update state
        localStorage.setItem("chatUserId", loggedInUser);
        setUserId(loggedInUser);
        // Clean the URL
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        // If no URL parameter, check localStorage as before
        const storedUserId = localStorage.getItem("chatUserId");
        if (storedUserId) {
          setUserId(storedUserId);
          console.log("User loaded from local storage:", storedUserId);
        }
      }
    } catch (error) {
      console.error("Error in auth initialization:", error);
    } finally {
      setIsLoading(false); // Finished loading check
    }
  }, []);

  const login = useCallback((id: string) => {
    try {
      localStorage.setItem("chatUserId", id);
      setUserId(id);
    } catch (error) {
      console.error("Error saving userId to localStorage:", error);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("chatUserId");
      setUserId(null);
    } catch (error) {
      console.error("Error removing userId from localStorage:", error);
    }
  }, []);

  const value = {
    isAuthenticated: !!userId,
    userId,
    login,
    logout,
    isLoading,
  };

  // Render null while loading to prevent brief flashes of wrong state
  if (isLoading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
