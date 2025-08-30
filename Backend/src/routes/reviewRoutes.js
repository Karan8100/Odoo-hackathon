// routes/reviewRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createReview,
  getReviewsByFacility,
} from "../controllers/reviewController.js";

const router = express.Router();

// Get all reviews for a facility
router.get("/:facilityId", getReviewsByFacility);

// Add a new review (protected so only logged-in users can post)
router.post("/", protect, createReview);

export default router;
