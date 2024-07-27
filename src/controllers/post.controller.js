import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";

// create post
const createPost = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    throw new ApiError(400, "All fields are required!");
  }

  const post = await Post.create({
    message,
    owner: req.user?._id,
  });

  if (!post) {
    throw new ApiError(500, "Something went wrong!");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post created successfully!"));
});

// get all posts
const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "postedBy",
      },
    },
    {
      $addFields: {
        postedBy: {
          $arrayElemAt: ["$postedBy", 0],
        },
        totalLikes: {
          $size: "$likes",
        },
        totalComments: {
          $size: "$comments",
        },
      },
    },
    {
      $project: {
        _id: 1,
        message: 1,
        totalLikes: 1,
        totalComments: 1,
        "postedBy.fullName": 1,
        "postedBy.username": 1,
        "postedBy.avatar.url": 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts fetched successfully!"));
});

// get posts by user
const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const posts = await Post.find({
    owner: user?._id,
  });

  if (!posts) {
    throw new ApiError(500, "Something went wrong! or Create a post!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts fetched successfully!"));
});

// delete post
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!postId) {
    throw new ApiError(400, "Post Id required!");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found!");
  }

  const { deletedCount } = await Post.deleteOne({
    _id: postId,
    owner: req.user?._id,
  });

  if (deletedCount === 0) {
    throw new ApiError(500, "Something went wrong");
  }

  /* Handled edge case: If the post is deleted by user, but comment exists, then comments also should be deleted from the comments model */
  const { acknowledged } = await Comment.deleteMany({
    postId,
  });

  if (!acknowledged) {
    throw new ApiError(500, "Something went wrong!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Post deleted successfully!"));
});

// update post
const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { message } = req.body;

  if (!(postId && message)) {
    throw new ApiError(400, "PostId and message are required!");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found!");
  }

  const updatedPost = await Post.findOneAndUpdate(
    { _id: postId, owner: req.user?._id },
    { $set: { message } },
    { new: true }
  );

  if (!updatedPost) {
    throw new ApiError(500, "Something went wrong");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPost, "Post updated successfully!"));
});

// like post
const likePost = asyncHandler(async (req, res) => {
  //     get that post u wna like - done
  //     this is patch req. send a flag = true (aka Like)  - done
  //     if the flag is true, then push the user_id of the logged in user into likes
  //     update the post

  const { postId } = req.params;
  const { flag } = req.body;

  if (!postId) {
    throw new ApiError(400, "PostId is required!");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found!");
  }

  if (flag && !post.likes?.includes(req.user._id)) {
    post.likes.push(req.user._id);
    await post.save({ validateBeforeSave: false, new: true });
  } else if (flag && post.likes?.includes(req.user._id)) {
    const index = post.likes.indexOf(req.user._id);
    post.likes.splice(index, 1);
    await post.save({ validateBeforeSave: false, new: true });
  }
  //     todo: edge case needs to be handled

  return res
    .status(200)
    .json(new ApiResponse(200, post, "Post updated successfully!"));
});

export { createPost, getPosts, getUserPosts, deletePost, updatePost, likePost };
