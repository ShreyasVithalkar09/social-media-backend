import mongoose, { Schema } from 'mongoose';
import {User} from "./user.model.js";

const PostSchema = new Schema({
    message: {
        type: String,
        required: true,
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
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
}, {timestamps: true});

export const Post =  mongoose.model('Post', PostSchema);