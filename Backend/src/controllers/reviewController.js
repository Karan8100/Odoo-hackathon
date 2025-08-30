import { Review } from "../models/reviewModel.js";

export const getReviewsByFacility = async (req, res) => {
  try {
    const reviews = await Review.find({ facilityId: req.params.facilityId })
      .populate("userId", "fullName")
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createReview = async (req, res) => {
  try {
    const { facilityId, rating, comment } = req.body;

    const review = await Review.create({
      userId: req.user._id, // from protect middleware
      facilityId,
      rating,
      comment,
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
