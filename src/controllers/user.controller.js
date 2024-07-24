import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import { ApiResponse} from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinary.js";

// generate access and refresh token
const generateAccessRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false});

        return { accessToken, refreshToken };

    }catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating the access and refresh tokens"
        );
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    const { username, email, password, fullName } = req.body;

    if([username, email, fullName, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "All fields are required!", []);
    }

    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    });

//     file handle
    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    if(existingUser) {
        throw new ApiError(409, "User with email or username already exists!", []);
    }

//     upload to cloudinary if the avatar exists
    const avatar = await uploadToCloudinary(avatarLocalPath, "users");

//     create user
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        fullName,
        avatar: {
            url: avatar?.url || "",
            public_id: avatar?.public_id || ""
        }
    })

    const userCreated = await User.findById(user?._id).select("-password -refreshToken");

    if (!userCreated) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(201, { user: userCreated }, "User registered successfully!")
    );
});

const loginUser = asyncHandler(async (req, res, next) => {
    const {email, username, password} = req.body;

    if([username, email, password].some((field) => field?.trim === "")) {
        throw new ApiError(400, "All fields are required!", []);
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    });

    if(!user) {
        throw new ApiError(404, "User does not exist!", []);
    }

//     validate the pwd
    const isValidatedPassword = await user.isPasswordValid(password);
    if(!isValidatedPassword) {
        throw new ApiError(403, "Invalid credentials!", []);
    }

    const { accessToken, refreshToken } = await generateAccessRefreshToken(user._id);

   const loggedInUser =  await User.findById(user._id).select("-password -refreshToken");

//    cookie options
    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
        new ApiResponse(
            200,
            {
                loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged In successfully!"
        )
    );
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const user =  await User.findById(req.user?._id).select("-password -refreshToken");
    return res.status(200).json(
        new ApiResponse(200, user, "User fetched successfully!")
    );
});

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    });


    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", undefined, options)
        .clearCookie("refreshToken", undefined, options)
        .json(
        new ApiResponse(200, {}, "User logged Out successfully!")
    )
})



export { registerUser, loginUser, getCurrentUser, logoutUser };