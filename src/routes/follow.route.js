import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middleware.js";
import {
  followUnfollowUser,
  getFollowersList,
  getFollowingsList,
} from "../controllers/follow.controller.js";

const router = new Router();

router.use(verifyJwtToken);

router.route("/:userId").post(followUnfollowUser);
router.route("/followers/:username").get(getFollowersList);
router.route("/followings/:username").get(getFollowingsList);

export default router;
