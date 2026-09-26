import mongoose from 'mongoose';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: typeof mongoose | null;
  // eslint-disable-next-line no-var
  var mongoosePromise: Promise<typeof mongoose> | null;
}

let cached = global.mongooseConn;
let cachedPromise = global.mongoosePromise;

export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  if (cached) {
    return cached;
  }

  if (!cachedPromise) {
    mongoose.set('strictQuery', true);
    cachedPromise = mongoose.connect(env.MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }).then((m) => {
      console.log(`[MongoDB] connected to ${m.connection.name}`);
      return m;
    });
  }

  try {
    cached = await cachedPromise;
    global.mongooseConn = cached;
    global.mongoosePromise = cachedPromise;
    return cached;
  } catch (e) {
    cachedPromise = null;
    global.mongoosePromise = null;
    throw e;
  }
}

