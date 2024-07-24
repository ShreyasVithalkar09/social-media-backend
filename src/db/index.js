import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DATABASE_NAME}`)
    } catch (error) {
        console.error("MONGODB_CONNECTION ERROR:", error)
        process.exit(1)
    }
}

export default connectDB