import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Signup from "./pages/auth/Signup";
import Login from "./pages/auth/Login";
import OtpVerification from "./pages/auth/OtpVerification";
import UserHomePage from "./pages/user/userHomepage";
import MoreOptions from "./pages/user/moreOptions";
import VenueDetail from "./pages/user/VenueDetail";
import CourtBooking from "./pages/user/CourtBooking";
import Payment from "./pages/user/Payment";
import useAuthUser from "./hooks/useAuthuser";
import EditProfile from "./pages/user/EditProfile";

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  if (isLoading) return <div>Loading...</div>;

  const isAuthenticated = Boolean(authUser);

  return (
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp-verification" element={<OtpVerification />} />
      <Route path="/" element={<UserHomePage />} />
      <Route path="/more-options" element={<MoreOptions />} />
      <Route path="/venue/:id" element={<VenueDetail />} />
      <Route path="/venue/:id/book" element={<CourtBooking />} />
      <Route path="/venue/:id/review" element={<Review />} />
      <Route path="/payment/:id" element={<Payment />} />
      <Route path="/edit-profile" element={<EditProfile />} />
    </Routes>
  );
};

export default App;
