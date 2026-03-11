const User = require('../models/User');
const UserCredential = require('../models/UserCredential');
const { UserDTO } = require('../dtos/UserDTO');
const mongoose = require('mongoose');

class UserRepository {
  async findById(id) {
    const user = await User.findById(id);
    return user ? new UserDTO(user) : null;
  }

  async findByEmail(email) {
    // Returns the profile info
    return await User.findOne({ email });
  }

  async getCredentialsByUserId(userId) {
    return await UserCredential.findOne({ user_id: userId });
  }

  async create(createUserDto) {
    // Note: Transactions require a replica set. 
    // For standalone local MongoDB, we use sequential creates.
    const { password_hash, ...profileData } = createUserDto;
    
    // Create profile
    const user = await User.create(profileData);
    
    // Create credentials
    try {
      await UserCredential.create({
        user_id: user._id,
        password_hash
      });
    } catch (error) {
      // Cleanup user profile if credential creation fails
      await User.findByIdAndDelete(user._id);
      throw error;
    }

    return new UserDTO(user);
  }
}

module.exports = new UserRepository();
