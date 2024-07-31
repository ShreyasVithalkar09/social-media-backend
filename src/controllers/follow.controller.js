import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

const getFollowersList = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const followersList = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        let: { followerIds: "$followers" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: [
                  "$_id",
                  {
                    $map: {
                      input: "$$followerIds",
                      as: "id",
                      in: { $toObjectId: "$$id" },
                    },
                  },
                ],
              },
            },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
        as: "followerDetails",
      },
    },
    {
      $project: {
        _id: 0,
        followerDetails: 1,
      },
    },
  ]);

  if (!followersList) {
    throw new ApiError(404, "Followers not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, followersList[0], "Followers fetched successfully!")
    );
});

const followUnfollowUser = asyncHandler(async (req, res) => {
  // bring the id of user you want to follow
  // check if user exists
  // Then check if user id you want to follow !== logged in user (user cannot follow self)
  // check if user is already following, if no then push data else remove

  const { userId } = req.params;

  const userToFollow = await User.findById(userId);
  const currentUser = await User.findById(req.user?._id);

  if (!userToFollow) {
    throw new ApiError(404, "User does not exist!");
  }

  if (userId === req.user?._id.toString()) {
    throw new ApiError(400, "User cannot follow self!");
  }

  const isFollowing = currentUser.following.includes(userId);
  let followStatus;

  try {
    if (isFollowing) {
      await User.findByIdAndUpdate(userId, {
        $pull: { followers: req.user._id },
      });
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: userId },
      });
      followStatus = false;
    } else {
      await User.findByIdAndUpdate(
        // add to his followers list
        userId,
        {
          $push: { followers: req.user._id },
        }
      );
      await User.findByIdAndUpdate(
        // add to your following list
        req.user._id,
        {
          $push: { following: userId },
        }
      );
      followStatus = true;
    }
  } catch (error) {
    throw new ApiError(500, error?.message || "Something went wrong!");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        followStatus
          ? "User followed successfully!"
          : "User Un-followed successfully!"
      )
    );
});

export { getFollowersList, followUnfollowUser };
