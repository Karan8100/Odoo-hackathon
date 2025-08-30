import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";


dotenv.config();
try {
  const __dirname = dirname(fileURLToPath(import.meta.url));


  dotenv.config({ path: resolve(__dirname, "../..", ".env") });

  dotenv.config({ path: resolve(__dirname, "../../..", ".env") });
} catch {}
import User from "../models/userschema.js";
import bcrypt from "bcryptjs";
import sendEmail from "../utils/sendEmail.js";
import generateToken from "../utils/generateToken.js";
import jwt from "jsonwebtoken";


const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const signup = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
      avatar: req.file ? req.file.path : undefined,
    });

    await user.save();

    await sendEmail(
      email,
      "Verify Your Email - QuickCourt",
      `Your OTP is: ${otp} (valid for 10 mins)`
    );

    res
      .status(201)
      .json({ success: true, message: "OTP sent to email. Please verify." });
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.isVerified)
      return res
        .status(400)
        .json({ success: false, message: "Already verified" });

    if (user.otp !== otp || Date.now() > user.otpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user);
    
    if (res.cookie) {
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      });
    }
    res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    if (!user.isVerified)
      return res
        .status(400)
        .json({ success: false, message: "Account not verified" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = generateToken(user);
    if (res.cookie) {
      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      });
    }
    res.json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("token");
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};


export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return res
        .status(500)
        .json({ message: "Server misconfiguration: admin creds missing" });
    }

    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { role: "Admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "5d" }
    );

    if (res.cookie) {
      res.cookie("admin_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 5 * 24 * 60 * 60 * 1000,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const adminLogout = async (req, res, next) => {
  try {
    res.clearCookie("admin_token");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};