import { useCallback, useState } from "react";
import Layout from "./Layout";
import VoltLogo from "./VoltLogo";

const LoginPage = () => {
  // isConnecting için yerel state eklendi
  const [isConnecting, setIsConnecting] = useState(false);

  const handleLogin = useCallback(() => {
    setIsConnecting(true);
    // setStreamError(null); // Kaldırıldı
    // Redirect to server's login endpoint (no userId parameter)
    window.location.href = "http://localhost:3000/login"; // Use simple string
    // Note: The user will be redirected away and return via /check-status
  }, []); // Bağımlılıklar güncellendi

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center items-center p-4 bg-[#121212]">
        <div className="bg-[#1a1a1a] p-8 rounded-lg shadow-xl text-center border border-[#333333] max-w-md w-full">
          <VoltLogo className="mx-auto mb-6 scale-150" />
          <h2 className="text-2xl font-semibold mb-4 text-white">Connect Google Drive</h2>
          <p className="text-[#a1a1aa] mb-8">
            Connect your Google Drive account to begin chatting with an AI assistant about your
            files.
          </p>
          <button
            onClick={handleLogin}
            type="button"
            disabled={isConnecting} // Yerel state kullanılıyor
            className="w-full bg-indigo-600 text-white font-medium py-2.5 px-6 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] disabled:bg-indigo-800 disabled:opacity-70 disabled:cursor-wait transition duration-150 ease-in-out cursor-pointer"
          >
            {isConnecting ? "Connecting..." : "Connect to Google Drive"}
          </button>
          {/* streamError gösterimi kaldırıldı */}
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;
