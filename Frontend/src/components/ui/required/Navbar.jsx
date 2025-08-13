import { Link } from "react-router-dom";
import { CalendarDays, LogOut } from "lucide-react";
import useAuthUser from "../../../hooks/useAuthuser";
import { axiosInstance } from "../../../lib/axios";

export  function Navbar() {
  const { authUser } = useAuthUser();
  const isAuthenticated = Boolean(authUser);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
      // Quick way to refresh UI/auth state
      window.location.reload();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <div className="text-2xl font-bold text-green-600">QuickCourt</div>

      <Link
        to="/booking"
        className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 hover:text-green-800 font-medium transition"
      >
        <CalendarDays size={20} />
        Booking
      </Link>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-green-200 bg-green-50 grid place-items-center">
                {authUser?.avatar ? (
                  <img
                    src={authUser.avatar}
                    alt={authUser.fullName || "User"}
                    className="h-full w-full object-cover"
                    onClick={() => navigate("/edit-profile")}
                  />
                ) : (
                  <span className="text-green-700 font-semibold">
                    {(authUser?.fullName || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-green-800 font-medium">
                {authUser?.fullName || "User"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-md border border-green-200 text-green-700 hover:bg-green-100 transition"
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition"
            >
              Signup
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
