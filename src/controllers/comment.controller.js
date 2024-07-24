import { asyncHandler} from "../utils/asyncHandler.js";
import { ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";

// add comment
const addComment = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { commentText } = req.body

    if(!commentText) {
        throw new ApiError(400, "Comment is required!");
    }

    const post = await Post.findById(postId)
    if(!post) {
        throw new ApiError(404, "Post not found!");
    }

    const comment = await Comment.create({
        commentText,
        postId,
        owner: req.user?._id,
    })

    if(!comment) {
        throw new ApiError(500, "Something went wrong!");
    }
     post.comments?.push(comment);
    await post.save({ validateBeforeSave: false})

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment added successfully!")
    )
})

// delete comment
const deleteComment = asyncHandler(async (req, res) => {
    const { postId, commentId } = req.params;
//     get comment id, post id
//     find comment exists if Yes,
//     delete comment, once success then
//     remove the comment entry from post
    const post = await Post.findById(postId)
    const comment = await Comment.findById(commentId);

    if(!post) {
        throw new ApiError(404, "Post does not exist!");
    }

    if(!comment) {
        throw new ApiError(404, "Comment does not exist!");
    }

    const { deletedCount } = await Comment.deleteOne(
        {
            _id: commentId,
            owner: req.user?._id,
        }
    )

    if(deletedCount === 0) {
        throw new ApiError(500, "Something went wrong");
    }

    const index = post.comments?.indexOf(commentId);
    post.comments.splice(index, 1);
    await post.save({ validateBeforeSave: false, new: true})

    return res.status(200).json(
        new ApiResponse(200, [], "Comment deleted successfully!")
    )
})

// get post comments
const getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId)
    if(!post) {
        throw new ApiError(404, "Post does not exist!");
    }

    const comments = await Comment.find(
        {
            postId
        }
    )

    if(!comments) {
        throw new ApiError(500, "Something went wrong!");
    }

    return res.status(200).json(
        new ApiResponse(200, comments, "Post comments fetched successfully!")
    )
})

export { addComment, deleteComment, getPostComments }