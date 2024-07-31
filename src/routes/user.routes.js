import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import {
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { followUnfollowUser, getFollowersList } from "../controllers/follow.controller.js";

const router = new Router();

router
  .route("/register")
  .post(upload.fields([{ name: "avatar", maxCount: 1 }]), registerUser);
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJwtToken, logoutUser);
router.route("/:userId").get(verifyJwtToken, getUserProfile);
router.route("/follow/:userId").post(verifyJwtToken, followUnfollowUser);
router.route("/followers/:userId").get(verifyJwtToken, getFollowersList);

export default router;
