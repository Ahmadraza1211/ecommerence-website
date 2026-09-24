import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'BUYER' | 'ADMIN';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  plainPassword?: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    plainPassword: { type: String },
    role: { type: String, enum: ['BUYER', 'ADMIN'], default: 'BUYER' },
    avatarUrl: { type: String },
    isVerified: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
