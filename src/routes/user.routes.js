import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import {
  getMyProfile,
  getUserProfileByUsername,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  removeAvatar,
  updateAvatar,
  updateUserProfile,
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
router
  .route("/profile/me/update-account")
  .patch(verifyJwtToken, updateUserProfile);
router
  .route("/profile/me/avatar")
  .patch(verifyJwtToken, upload.single("avatar"), updateAvatar)
  .delete(verifyJwtToken, removeAvatar)
router.route("/refresh-token").post(verifyJwtToken, refreshAccessToken);

export default router;
