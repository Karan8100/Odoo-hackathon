import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { axiosInstance } from "@/lib/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "",
    avatar: null,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const { mutate: signupMutate, isPending } = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("fullName", form.fullName);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (form.role) formData.append("role", form.role);
      if (form.avatar) formData.append("avatar", form.avatar);
      return axiosInstance.post("/auth/signup", formData);
    },
    onSuccess: () => {
      try {
        sessionStorage.setItem("pendingEmail", form.email);
      } catch {}
      navigate("/otp-verification");
    },
    onError: (err) => {
      console.error(err?.response?.data || err?.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    signupMutate(undefined, { onSettled: () => setLoading(false) });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <div className="hidden md:flex flex-1 bg-gray-100 border-r border-gray-300 h-screen overflow-hidden">
        <img
          src="/login.jpg"
          alt="Sign Up Illustration"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-xl p-6 w-full max-w-md space-y-4"
        >
          <h2 className="text-2xl font-bold text-center">Sign Up</h2>

          <div>
            <Label>Full Name</Label>
            <Input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label>Role</Label>
            <Select
              value={form.role || undefined}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((role) => role !== "Admin") // 👈 removes Admin
                  .map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Avatar</Label>
            <Input
              type="file"
              name="avatar"
              accept="image/*"
              onChange={handleChange}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || isPending}
            className="w-full"
          >
            {loading || isPending ? "Signing up..." : "Sign Up"}
          </Button>

          <p className="text-center text-sm text-gray-600 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
