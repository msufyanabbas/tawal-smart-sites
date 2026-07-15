import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthUser, Role } from "../types";

// External logout hook — apiClient registers itself here so the 401 interceptor
// can clear React state without importing the context (avoids a cycle).
let externalLogout: (() => Promise<void>) | null = null;

export const setExternalLogout = (fn: () => Promise<void>) => {
  externalLogout = fn;
};

export const callExternalLogout = async () => {
  if (externalLogout) await externalLogout();
};

interface AuthContextData {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  role: Role | null;
  login: (
    accessToken: string,
    refreshToken?: string,
    userData?: AuthUser,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  isLoading: true,
  isLoggedIn: false,
  user: null,
  role: null,
  login: async () => {},
  logout: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({
  children,
}: AuthProviderProps): React.ReactElement => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const [token, raw] = await Promise.all([
          AsyncStorage.getItem("access_token"),
          AsyncStorage.getItem("userData"),
        ]);
        setIsLoggedIn(!!token);
        if (raw) {
          try {
            setUser(JSON.parse(raw) as AuthUser);
          } catch {
            /* corrupt cache */
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  const login = async (
    accessToken: string,
    refreshToken?: string,
    userData?: AuthUser,
  ) => {
    await AsyncStorage.setItem("access_token", accessToken);
    if (refreshToken) await AsyncStorage.setItem("refresh_token", refreshToken);
    if (userData) {
      await AsyncStorage.setItem("userData", JSON.stringify(userData));
      setUser(userData);
    }
    setIsLoggedIn(true);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      "access_token",
      "refresh_token",
      "userData",
    ]);
    setIsLoggedIn(false);
    setUser(null);
  };

  useEffect(() => {
    setExternalLogout(logout);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isLoggedIn,
        user,
        role: user?.role ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
