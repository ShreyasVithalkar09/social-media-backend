import jwt from 'jsonwebtoken'
import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import { User} from "../models/user.model.js";

const verifyJwtToken = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token) {
        throw new ApiError(403, "Unauthorized request!");
    }

    try {
    // decode the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken");

        if(!user) {
            throw new ApiError(403, "Unauthorized request!");
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access token!");
    }
})

export { verifyJwtToken };