import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";

// generate access and refresh token
const generateAccessRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating the access and refresh tokens"
    );
  }
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  const userProfile = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "owner",
        as: "user_posts",
      },
    },
    {
      $addFields: {
        postsCount: {
          $size: "$user_posts",
        },
        followersCount: {
          $size: "$followers",
        },
        followingCount: {
          $size: "$following",
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        fullName: 1,
        email: 1,
        bio: 1,
        "avatar.url": 1,
        postsCount: 1,
        followersCount: 1,
        followingCount: 1,
        user_posts: 1,
      },
    },
  ]);

  if (!userProfile[0]) {
    throw new ApiError(404, "User profile does not exist!");
  }
  return userProfile[0];
};

// register user
const registerUser = asyncHandler(async (req, res, next) => {
  const { username, email, password, fullName, bio } = req.body;

  if (
    [username, email, fullName, password, bio].some(
      (field) => field?.trim === ""
    )
  ) {
    throw new ApiError(400, "All fields are required!", []);
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  //     file handle
  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  if (existingUser) {
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
    bio,
    avatar: {
      url: avatar?.url || "",
      public_id: avatar?.public_id || "",
    },
  });

  const userCreated = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  if (!userCreated) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: userCreated },
        "User registered successfully!"
      )
    );
});

// login
const loginUser = asyncHandler(async (req, res, next) => {
  const { email, username, password } = req.body;

  if ([username, email, password].some((field) => field?.trim === "")) {
    throw new ApiError(400, "All fields are required!", []);
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist!", []);
  }

  //     validate the pwd
  const isValidatedPassword = await user.isPasswordValid(password);
  if (!isValidatedPassword) {
    throw new ApiError(403, "Invalid credentials!", []);
  }

  const { accessToken, refreshToken } = await generateAccessRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //    cookie options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In successfully!"
      )
    );
});

// get profile by username
const getUserProfileByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const userProfile = await getUserProfile(user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(200, userProfile, "User-profile fetched successfully!")
    );
});

// get my profile
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const userProfile = await getUserProfile(req.user._id);

  return res
    .status(200)
    .json(
      new ApiResponse(200, userProfile, "User-profile fetched successfully!")
    );
});

// logout
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", undefined, options)
    .clearCookie("refreshToken", undefined, options)
    .json(new ApiResponse(200, {}, "User logged Out successfully!"));
});

// update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const { username, email, fullName, bio } = req.body;

  if (!(username || email || fullName || bio)) {
    throw new ApiError(400, "All fields are required!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        username: username?.toLowerCase(),
        email,
        fullName,
        bio,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(500, "Something went wrong!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile updated successfully!"));
});

// update avatar
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!", []);
  }

  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User does not exist!", []);
  }

  const avatar = await uploadToCloudinary(avatarLocalPath, "users");

  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar", []);
  }

  if (avatar) {
    // delete old avatar after success
    await deleteFromCloudinary(user?.avatar?.public_id);
  }

  user.avatar.public_id = avatar.public_id;
  user.avatar.url = avatar.url;
  await user.save({ validateBeforeSave: false, new: true });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!!"));
});

// remove avatar
const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User does not exist!", []);
  }

  const public_id = user.avatar?.public_id;
  const { result } = await deleteFromCloudinary(public_id);

  if (result !== "ok") {
    throw new ApiError(500, "Error while deleting the avatar!");
  }

  user.avatar.url = "";
  user.avatar.public_id = "";
  await user.save({ validateBeforeSave: true, new: true });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar removed successfully!"));
});

// refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    // decode the token
    const decoded = jwt.decode(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded?._id);

    if (!user) {
      throw new ApiError(404, "User does not exist");
    }

    // verify the token
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access token refreshed!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// delete account
const deleteUserAccount = asyncHandler(async (req, res, next) => {
  // Make this operation as transaction, so if something goes wrong, then changes will be rolled back
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // find if user exists
    const user = await User.findById(req.user?._id).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError(404, "User does not exist!", []);
    }

    // delete all associated posts and comments

    const comments = await Comment.find({ owner: user._id }).session(session);

    for (let comment of comments) {
      await Post.updateMany(
        { comments: comment._id },
        { $pull: { comments: comment._id } },
        { session }
      );
      await Comment.deleteOne({ _id: comment._id }).session(session);
    }

    await Post.updateMany(
      { likes: user._id },
      { $pull: { likes: user._id } },
      { session }
    );

    await Post.deleteMany({
      owner: user._id,
    }).session(session);

    // also remove this user from followers
    await User.updateMany(
      { followers: user._id },
      { $pull: { followers: user._id } },
      { session }
    );

    await User.updateMany(
      { following: user._id },
      { $pull: { following: user._id } },
      { session }
    );

    // now delete the user
    const deletedUser = await User.findByIdAndDelete(user._id).session(session);
    if (deletedUser) {
      await session.commitTransaction();
      session.endSession();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User account deleted successfully!"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(500, error?.message || "Something went wrong!", []);
  }
});

export {
  registerUser,
  loginUser,
  getUserProfileByUsername,
  logoutUser,
  getMyProfile,
  updateUserProfile,
  updateAvatar,
  removeAvatar,
  refreshAccessToken,
  deleteUserAccount,
};
