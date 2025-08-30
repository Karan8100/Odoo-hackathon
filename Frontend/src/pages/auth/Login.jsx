import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/lib/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const openAdmin = () => navigate("/admin/login");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const { mutate: loginMutate, isPending } = useMutation({
    mutationFn: async () => axiosInstance.post("/auth/login", form),
    onSuccess: (res) => {
      const role = res?.data?.user?.role;
      if (role === "Facility Owner") {
        navigate("/owner");
      } else {
        navigate("/");
      }
    },
    onError: (err) => {
      const message = err?.response?.data?.message || "Login failed";
      if (message.toLowerCase().includes("not verified")) {
        try {
          sessionStorage.setItem("pendingEmail", form.email);
        } catch {}
        navigate("/otp-verification");
      } else {
        console.error(message);
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    loginMutate(undefined, { onSettled: () => setLoading(false) });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Image */}
      <div className="hidden md:flex flex-1 bg-gray-100 border-r border-gray-300 h-screen overflow-hidden">
        <img
          src="/login.jpg"
          alt="Login Illustration"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Login form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-gray-50">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md space-y-6"
        >
          <h2 className="text-2xl font-bold text-center">Login</h2>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || isPending}
            className="w-full"
          >
            {loading || isPending ? "Logging in..." : "Login"}
          </Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-600 hover:underline font-medium"
            >
              Sign Up
            </Link>
          </p>

          <div className="pt-2">
            <button type="button" onClick={openAdmin} className="w-full text-sm text-gray-700 underline">
              Login as Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
