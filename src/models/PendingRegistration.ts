import mongoose, { Document, Schema } from 'mongoose';

/**
 * A registration awaiting email verification.
 *
 * Deliberately NOT a User. Until the code is verified there is no account: an
 * unverified User row would occupy the unique email index, so an abandoned
 * signup would block the real owner of that address from ever registering, and
 * a half-made account would be visible to the studio's customer list.
 *
 * What it holds:
 *  - `passwordHash` — bcrypt, hashed the moment it arrives. The plaintext
 *    password is never written anywhere, not even for the minutes this record
 *    lives.
 *  - `otpHash` — bcrypt too. A leaked collection therefore yields neither the
 *    password nor a usable code.
 *
 * The account is built from THIS record on verification, never from the verify
 * request body, which is what guarantees the address that received the code is
 * the address the account ends up with.
 */
export interface IPendingRegistration extends Document {
  email: string;
  name: string;
  passwordHash: string;
  otpHash: string;
  /** When the current code stops being accepted. */
  otpExpiresAt: Date;
  /** Wrong codes entered against the current record. */
  attempts: number;
  /** Codes issued for this record, the first included. */
  resendCount: number;
  lastSentAt: Date;
  createdAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 1 },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/**
 * Abandoned attempts clear themselves after a day.
 *
 * The sweep is on `createdAt`, not `otpExpiresAt`: if the record vanished the
 * moment its code lapsed, an expired code and a code that was never requested
 * would be indistinguishable, and the customer would be told "start again"
 * instead of "that code expired, here's a new one".
 */
pendingRegistrationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const PendingRegistration = mongoose.model<IPendingRegistration>(
  'PendingRegistration',
  pendingRegistrationSchema
);
