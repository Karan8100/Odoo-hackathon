import jwt from "jsonwebtoken";
import User from "../models/userschema.js";

export const protect = async (req, res, next) => {
  try {
   
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.toLowerCase().startsWith("bearer ")
    ) {
      token = authHeader.slice(7).trim();
    }

    if (!token && req.cookies) {
      token = req.cookies.token || req.cookies.jwt || null;
    }

    if (!token && req.query && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized, no token provided" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server misconfiguration: JWT secret missing" });
    }

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    req.user = user; 
    return next();
  } catch (error) {
    if (error && error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Not authorized, token expired" });
    }
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};


export const protectAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;

    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.toLowerCase().startsWith("bearer ")
    ) {
      token = authHeader.slice(7).trim();
    }

    if (!token && req.cookies) {
      token = req.cookies.admin_token || null;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized (admin), no token provided" });
    }

    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server misconfiguration: JWT secret missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.admin = { role: "Admin" };
    return next();
  } catch (error) {
    if (error && error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Not authorized (admin), token expired" });
    }
    return res
      .status(401)
      .json({ message: "Not authorized (admin), invalid token" });
  }
};