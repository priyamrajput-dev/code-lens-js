import { User } from "../models/user.model.js";

class UserRepository {
  async findById(userId) {
    return await User.findById(userId).lean();
  }

  async findByEmail(email) {
    return await User.findOne({ email }).lean();
  }

  async findByRazorpaySubscriptionId(subscriptionId) {
    return await User.findOne({ razorpaySubscriptionId: subscriptionId }).lean();
  }

  async updateSubscription(userId, data) {
    return await User.findByIdAndUpdate(userId, { $set: data }, { new: true }).lean();
  }
}

export default UserRepository;
