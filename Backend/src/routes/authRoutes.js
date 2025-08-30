import express from "express";
import { signup, verifyOtp, login, logout, adminLogin, adminLogout } from "../controllers/authControllers.js";
import upload from "../middleware/upload.js";
import { protect, protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", upload.single("avatar"), signup);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/logout", logout);
router.post("/admin/login", adminLogin);
router.post("/admin/logout", adminLogout);

router.get("/me", protect, (req, res) => {
  return res.json({ success: true, user: req.user });
});



//Not implemented yet
router.get("/admin/me", protectAdmin, (req, res) => {
  return res.json({ success: true, admin: { role: "Admin" } });
});

export default router;
