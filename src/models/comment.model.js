import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema({
    commentText: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 650,
    },
    postId: {
        type: Schema.Types.ObjectId,
        ref: "Post",
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    likes: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
}, { timestamps: true });

export const Comment = mongoose.model('Comment', CommentSchema);