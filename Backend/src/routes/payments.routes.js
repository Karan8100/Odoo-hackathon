import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getQuote,
  createPaymentSession,
  confirmPayment,
  createStripePaymentIntent,
  finalizePayment,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/payments.controllers.js";

const router = express.Router();

// Protect all payment routes
router.use(protect);

// Get price quote for a court and time range
router.get("/quote", getQuote);

// Create a Stripe PaymentIntent
router.post("/intent", createStripePaymentIntent);

// Finalize payment (after PI succeeded)
router.post("/finalize", finalizePayment);

// Razorpay order and verification --> Not implemented due to some errors in the doumenttaion
router.post("/razorpay/order", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

// Legacy mock flows
router.post("/session", createPaymentSession);
router.post("/confirm", confirmPayment);

export default router;
