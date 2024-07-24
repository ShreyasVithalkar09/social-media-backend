import { Router } from 'express';
import { verifyJwtToken} from "../middlewares/auth.middleware.js";
import {getCurrentUser, loginUser, logoutUser, registerUser} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";

const router = new Router();

router.route("/register").post(
    upload.fields([{ name: "avatar", maxCount: 1}]),
    registerUser)
router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJwtToken, logoutUser)
router.route("/current-user").get(verifyJwtToken, getCurrentUser)

export default router;