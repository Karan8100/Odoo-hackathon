import mongoose from "mongoose";
import Stripe from "stripe";
import { Court } from "../models/courtSchema.js";
import { Booking } from "../models/bookingschema.js";
import { Payment } from "../models/paymentSchema.js";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const toDate = (value) => (value instanceof Date ? value : new Date(value));

const computeDurationHours = (start, end) => {
  const ms = end.getTime() - start.getTime();
  return ms / (1000 * 60 * 60);
};

const combineDateAndTime = (dateStr, timeStr) => {

  return new Date(`${dateStr}T${timeStr}:00`);
};

const findCheapestCourtForSport = async (facilityId, sportType) => {
  return Court.findOne({ facilityId, sportType })
    .sort({ pricePerHour: 1 })
    .exec();
};


export const getQuote = async (req, res) => {
  try {
    const { courtId, startTime, endTime } = req.query;

    if (!courtId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "courtId, startTime and endTime are required",
      });
    }

    if (!mongoose.isValidObjectId(courtId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid courtId" });
    }

    const court = await Court.findById(courtId).exec();
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    const start = toDate(startTime);
    const end = toDate(endTime);
    const durationHours = computeDurationHours(start, end);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "End time must be after start time" });
    }

    const amount = durationHours * court.pricePerHour;

    return res.status(200).json({
      success: true,
      message: "Quote computed successfully",
      data: { amount, currency: "INR", durationHours },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to compute quote",
    });
  }
};


export const createStripePaymentIntent = async (req, res) => {
  try {
    const { facilityId, sportType, date, startTime, durationHours, amountOverride } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!facilityId || !sportType || !date || !startTime || !durationHours) {
      return res.status(400).json({
        success: false,
        message:
          "facilityId, sportType, date, startTime and durationHours are required",
      });
    }

    if (!mongoose.isValidObjectId(facilityId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid facilityId" });
    }

    const court = await findCheapestCourtForSport(facilityId, sportType);
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "No court available for this sport" });
    }

    const start = combineDateAndTime(date, startTime);
    const end = new Date(
      start.getTime() + Number(durationHours) * 60 * 60 * 1000
    );

   
    const overlapping = await Booking.findOne({
      courtId: court._id,
      status: "confirmed",
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).exec();
    if (overlapping) {
      return res
        .status(409)
        .json({ success: false, message: "Time slot is already booked" });
    }

    const amountInPaise = Math.round(
      (amountOverride ?? court.pricePerHour * Number(durationHours)) * 100
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPaise,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: String(userId),
        facilityId: String(facilityId),
        courtId: String(court._id),
        sportType,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "PaymentIntent created",
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment intent",
    });
  }
};


export const createRazorpayOrder = async (req, res) => {
  try {
    const { facilityId, sportType, date, startTime, durationHours, amountOverride } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!facilityId || !sportType || !date || !startTime || !durationHours)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    const court = await findCheapestCourtForSport(facilityId, sportType);
    if (!court) return res.status(404).json({ success: false, message: "No court available for this sport" });

    const start = combineDateAndTime(date, startTime);
    const end = new Date(start.getTime() + Number(durationHours) * 60 * 60 * 1000);

    const overlapping = await Booking.findOne({
      courtId: court._id,
      status: "confirmed",
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).exec();
    if (overlapping) {
      return res.status(409).json({ success: false, message: "Time slot is already booked" });
    }

    
    const amountInPaise = Math.round(
      (amountOverride ?? court.pricePerHour * Number(durationHours)) * 100
    );

   
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ success: false, message: "Razorpay keys not configured" });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountInPaise, currency: "INR" }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ success: false, message: data?.error?.description || "Failed to create order" });
    }

    return res.status(201).json({ success: true, message: "Razorpay order created", data: { orderId: data.id, amount: data.amount, currency: data.currency, courtId: court._id, startISO: start.toISOString(), endISO: end.toISOString() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to create Razorpay order" });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { courtId, facilityId, startISO, endISO } = req.body; // sent back from client
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment fields" });
    }

  
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

   
    const start = new Date(startISO);
    const end = new Date(endISO);
    const durationHours = computeDurationHours(start, end);

    const court = await Court.findById(courtId).exec();
    if (!court) return res.status(404).json({ success: false, message: "Court not found" });

    const overlapping = await Booking.findOne({
      courtId,
      status: "confirmed",
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).exec();
    if (overlapping) {
      return res.status(409).json({ success: false, message: "Time slot has just been booked" });
    }

    const totalPrice = durationHours * court.pricePerHour;
    
 
    const booking = await Booking.create({
      userId,
      facilityId,
      courtId,
      startTime: start,
      endTime: end,
      totalPrice,
      status: "confirmed",
    });

    
    const payment = await Payment.create({
      bookingId: booking._id,
      provider: "razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: totalPrice,
      currency: "inr",
      status: "succeeded",
    });

    return res.status(201).json({ 
      success: true, 
      message: "Razorpay payment verified and booking created", 
      data: { 
        booking,
        payment: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          amount: totalPrice,
          currency: "inr"
        }
      } 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to verify Razorpay payment" });
  }
};

export const finalizePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!paymentIntentId) {
      return res
        .status(400)
        .json({ success: false, message: "paymentIntentId is required" });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi || pi.status !== "succeeded") {
      return res.status(400).json({
        success: false,
        message: "Payment is not successful yet",
        status: pi?.status,
      });
    }

    const { facilityId, courtId, startISO, endISO } = pi.metadata || {};
    if (!facilityId || !courtId || !startISO || !endISO) {
      return res.status(400).json({
        success: false,
        message: "Missing booking metadata in payment intent",
      });
    }

   
    const start = new Date(startISO);
    const end = new Date(endISO);

    const overlapping = await Booking.findOne({
      courtId,
      status: "confirmed",
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).exec();
    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: "Time slot has just been booked by someone else",
      });
    }

    const court = await Court.findById(courtId).exec();
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    const durationHours = computeDurationHours(start, end);
    const totalPrice = durationHours * court.pricePerHour;


    const booking = await Booking.create({
      userId,
      facilityId,
      courtId,
      startTime: start,
      endTime: end,
      totalPrice,
      status: "confirmed",
    });

  
    const payment = await Payment.create({
      bookingId: booking._id,
      provider: "stripe",
      stripePaymentIntentId: paymentIntentId,
      amount: totalPrice,
      currency: "inr",
      status: "succeeded",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created after successful payment",
      data: { 
        booking,
        payment: {
          paymentIntentId: paymentIntentId,
          amount: totalPrice,
          currency: "inr"
        }
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to finalize payment",
    });
  }
};


export const createPaymentSession = async (req, res) => {
  try {
    const { courtId, startTime, endTime } = req.body;

    if (!courtId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "courtId, startTime and endTime are required",
      });
    }

    if (!mongoose.isValidObjectId(courtId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid courtId" });
    }

    const court = await Court.findById(courtId).exec();
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    const start = toDate(startTime);
    const end = toDate(endTime);
    const durationHours = computeDurationHours(start, end);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "End time must be after start time" });
    }


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

    const amount = durationHours * court.pricePerHour;
    const sessionId = `mock_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return res.status(201).json({
      success: true,
      message: "Payment session created",
      data: {
        sessionId,
        amount,
        currency: "INR",
        courtId,
        startTime: start,
        endTime: end,
        expiresAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment session",
    });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { sessionId, courtId, startTime, endTime, paymentReference } =
      req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!sessionId || !courtId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "sessionId, courtId, startTime and endTime are required",
      });
    }

    if (!mongoose.isValidObjectId(courtId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid courtId" });
    }

    const court = await Court.findById(courtId).exec();
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Court not found" });
    }

    const start = toDate(startTime);
    const end = toDate(endTime);
    const durationHours = computeDurationHours(start, end);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "End time must be after start time" });
    }

    // final overlap check
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

 
    const booking = await Booking.create({
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
      message: "Payment confirmed and booking created",
      data: {
        booking,
        payment: { sessionId, paymentReference: paymentReference || sessionId },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
};
