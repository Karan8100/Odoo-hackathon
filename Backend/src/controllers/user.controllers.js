import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/userschema.js";
import { Facility } from "../models/facilitySchema.js";
import { Court } from "../models/courtSchema.js";
import { Review } from "../models/reviewSchema.js";
import { Booking } from "../models/bookingschema.js";


const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toFloat = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const getVenues = async (req, res) => {
  try {
    const page = toInt(req.query.page ?? 1, 1);
    const limit = toInt(req.query.limit ?? 10, 10);
    const search = req.query.search?.trim();
    const sport = req.query.sport?.trim();
    const maxPrice = req.query.maxPrice
      ? toInt(req.query.maxPrice, undefined)
      : undefined;
    const minRating = req.query.minRating
      ? toFloat(req.query.minRating, undefined)
      : undefined;

    const pipeline = [];

 
    pipeline.push({ $match: { status: "approved" } });


    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { "location.city": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

 
    if (sport) {
      pipeline.push({
        $match: { supportedSports: { $regex: sport, $options: "i" } },
      });
    }

    // Join with courts and reviews
    pipeline.push(
      {
        $lookup: {
          from: "courts",
          localField: "_id",
          foreignField: "facilityId",
          as: "courts",
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "facilityId",
          as: "reviews",
        },
      }
    );

    // If a max price is provided, filter facilities having at least one court <= maxPrice
    if (typeof maxPrice === "number") {
      pipeline.push(
        { $unwind: "$courts" },
        { $match: { "courts.pricePerHour": { $lte: maxPrice } } },
        { $group: { _id: "$_id", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } }
      );
    }

   
    pipeline.push({
      $addFields: {
        startingPrice: { $min: "$courts.pricePerHour" },
        averageRating: { $avg: "$reviews.rating" },
      },
    });

   
    if (typeof minRating === "number") {
      pipeline.push({ $match: { averageRating: { $gte: minRating } } });
    }


    const skip = (page - 1) * limit;
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    });

    const aggResult = await Facility.aggregate(pipeline).exec();
    const { data = [], metadata = [] } = aggResult[0] || {};
    const total = metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const venues = data.map((v) => ({
      id: v._id,
      name: v.name,
      sportTypes: v.supportedSports,
      startingPrice: v.startingPrice ?? 0,
      location: v.location?.city,
      rating:
        typeof v.averageRating === "number"
          ? Number(v.averageRating.toFixed(1))
          : 0,
      photos: v.photos || [],
      amenities: v.amenities || [],
      description: v.description || "",
      fullLocation: v.location || {},
    }));

    return res.status(200).json({
      success: true,
      message: "Venues fetched successfully",
      data: { venues, pagination: { totalPages, currentPage: page, total } },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error fetching venues",
    });
  }
};

export const getSingleVenue = async (req, res) => {
  try {
    const { venueId } = req.params;

    if (!mongoose.isValidObjectId(venueId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Venue ID" });
    }

    const facility = await Facility.findById(venueId).exec();
    if (!facility || facility.status !== "approved") {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found or not approved" });
    }

    const [courts, reviews] = await Promise.all([
      Court.find({ facilityId: venueId }).exec(),
      Review.find({ facilityId: venueId })
        .populate("userId", "fullName avatar")
        .exec(),
    ]);

    const startingPrice = courts && courts.length
      ? Math.min(...courts.map((c) => c.pricePerHour || Infinity))
      : 0;
    const averageRating = reviews && reviews.length
      ? Number(
          (
            reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
            reviews.length
          ).toFixed(1)
        )
      : 0;

    const response = {
      id: facility._id,
      name: facility.name,
      description: facility.description,
      address: `${facility.location.address}, ${facility.location.city}`,
      sportTypes: facility.supportedSports,
      amenities: facility.amenities,
      photos: facility.photos,
      startingPrice: Number.isFinite(startingPrice) ? startingPrice : 0,
      rating: averageRating,
      courts,
      reviews: reviews.map((r) => ({
        user: r.userId?.fullName,
        avatar: r.userId?.avatar,
        rating: r.rating,
        comment: r.comment,
        sportType: r.sportType,
        createdAt: r.createdAt,
      })),
    };

    return res.status(200).json({
      success: true,
      message: "Venue details fetched successfully",
      data: response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch venue details",
    });
  }
};

export const createReview = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { rating, comment, sportType } = req.body;
    const userId = req.user?._id;

    if (!mongoose.isValidObjectId(venueId)) {
      return res.status(400).json({ success: false, message: "Invalid Venue ID" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const facility = await Facility.findById(venueId).exec();
    if (!facility || facility.status !== "approved") {
      return res.status(404).json({ success: false, message: "Venue not found or not approved" });
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be a number between 1 and 5" });
    }

    const newReview = await Review.create({
      userId,
      facilityId: venueId,
      rating,
      comment: comment ?? "",
      sportType: sportType ?? undefined,
    });

    return res.status(201).json({ success: true, message: "Review created", data: newReview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create review" });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { courtId, startTime, endTime } = req.body;
    const userId = req.user._id;

    if (!courtId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Court ID, start time, and end time are required",
      });
    }

    if (!mongoose.isValidObjectId(courtId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Court ID" });
    }

    const court = await Court.findById(courtId).exec();
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "End time must be after start time" });
    }

    // Check overlapping bookings for the same court
    const overlapping = await Booking.findOne({
      courtId,
      status: "confirmed",
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).exec();

    if (overlapping) {
      return res
        .status(409)
        .json({ success: false, message: "Time slot is already booked" });
    }

    const totalPrice = durationHours * court.pricePerHour;

    const newBooking = await Booking.create({
      userId,
      facilityId: court.facilityId,
      courtId,
      startTime: start,
      endTime: end,
      totalPrice,
      status: "confirmed",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: newBooking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, date } = req.query;

    const query = { userId };
    if (status) query.status = status;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      query.startTime = { $gte: dayStart, $lte: dayEnd };
    }

    const bookings = await Booking.find(query)
      .populate({ path: "facilityId", select: "name" })
      .populate({ path: "courtId", select: "name sportType" })
      .sort({ startTime: -1 })
      .exec();

    const formatted = bookings.map((b) => ({
      id: b._id,
      venueName: b.facilityId?.name,
      sportType: b.courtId?.sportType,
      courtName: b.courtId?.name,
      date: b.startTime.toISOString().split("T")[0],
      time: `${b.startTime.toTimeString().substring(0, 5)} - ${b.endTime
        .toTimeString()
        .substring(0, 5)}`,
      status: b.status,
      canCancel: b.status === "confirmed" && new Date() < b.startTime,
    }));

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bookings",
    });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Booking ID" });
    }

    const booking = await Booking.findOne({ _id: bookingId, userId }).exec();
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be cancelled",
      });
    }

    if (new Date() >= booking.startTime) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a booking that has already started",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel booking",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").exec();
    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch profile",
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, avatar } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fullName, avatar } },
      { new: true }
    )
      .select("-password")
      .exec();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

export const changeMyPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "New passwords do not match" });
    }

    const user = await User.findById(req.user._id).exec();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};
