import mongoose from "mongoose";
import { Court } from "../models/courtSchema.js";

export const createCourt = async (req, res, next) => {
  try {
    const { facilityId, name, sportType, pricePerHour, operatingHours } =
      req.body;

    if (
      !facilityId ||
      !name ||
      !sportType ||
      !pricePerHour ||
      !operatingHours
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

   
    const facilityObjectId = new mongoose.Types.ObjectId(facilityId);

    const court = new Court({
      facilityId: facilityObjectId,
      name,
      sportType,
      pricePerHour,
      operatingHours,
    });

    await court.save();

    res.status(201).json({ success: true, court });
  } catch (err) {
    next(err);
  }
};

export const getCourtsByFacility = async (req, res, next) => {
  try {
    const { facilityId } = req.params;

    // Convert facilityId to ObjectId for query as well
    const facilityObjectId = mongoose.Types.ObjectId(facilityId);

    const courts = await Court.find({ facilityId: facilityObjectId });

    res.json({ success: true, courts });
  } catch (err) {
    next(err);
  }
};

export const updateCourt = async (req, res, next) => {
  try {
    const { courtId } = req.params;
    const updates = req.body;

    const court = await Court.findByIdAndUpdate(courtId, updates, {
      new: true,
    });

    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    res.json({ success: true, court });
  } catch (err) {
    next(err);
  }
};

export const deleteCourt = async (req, res, next) => {
  try {
    const { courtId } = req.params;

    const court = await Court.findByIdAndDelete(courtId);

    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    res.json({ success: true, message: "Court deleted successfully" });
  } catch (err) {
    next(err);
  }
};
