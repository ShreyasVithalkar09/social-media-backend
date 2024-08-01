import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import {API_VERSION} from "./constants/constants.js";
import userRoutes from "./routes/user.routes.js";
import postRoutes from "./routes/post.route.js";
import followRoutes from "./routes/follow.route.js";

const app = express();

// basic middlewares and configs
app.use(express.json({
    limit: "64kb",
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// cookie middleware
app.use(cookieParser());

// route declarations
app.use(`/api/${API_VERSION}/users`, userRoutes)
app.use(`/api/${API_VERSION}/posts`, postRoutes)
app.use(`/api/${API_VERSION}/users/follow`, followRoutes)


// test route
app.get("/api/v1/test", (req, res) => {
    res.status(200).json({
        status: "success",
    })
})

export { app }