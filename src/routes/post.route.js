import { Router } from 'express';
import {verifyJwtToken} from "../middlewares/auth.middleware.js";
import {
    createPost,
    deletePost,
    getPosts,
    getUserPosts,
    likePost,
    updatePost
} from "../controllers/post.controller.js";
import {addComment, deleteComment, getPostComments, likeComments} from "../controllers/comment.controller.js";

const router = new Router();

router.use(verifyJwtToken) // applies for all requests

router.route("/").post(createPost).get(getPosts)
router.route("/:username").get(getUserPosts)
router.route("/:postId").delete(deletePost).put(updatePost)
router.route("/:postId/like").patch(likePost)
router.route("/:postId/comments").post(addComment).get(getPostComments)
router.route("/:postId/comments/:commentId").delete(deleteComment)
router.route("/:postId/comments/:commentId/like").patch(likeComments)

export default router;