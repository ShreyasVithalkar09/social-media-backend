import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env"
})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.error("ERROR:: ", error)
            throw error
        });

        app.listen(process.env.PORT || 4001, () => {
            console.log("Server running on port " + process.env.PORT);
        })
    })
    .catch((error) => {
        console.error("MONGO DB connection failed:: ", error)
    })


