import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import {
  getMyProfile,
  getUserProfileByUsername,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = new Router();

router
  .route("/register")
  .post(upload.fields([{ name: "avatar", maxCount: 1 }]), registerUser);
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJwtToken, logoutUser);
router
  .route("/profile/:username")
  .get(verifyJwtToken, getUserProfileByUsername);
router.route("/profile/get/me").get(verifyJwtToken, getMyProfile);

export default router;
