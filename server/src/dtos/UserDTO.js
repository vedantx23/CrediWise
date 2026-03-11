class UserDTO {
  constructor(user) {
    this.id = user._id;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.created_at = user.created_at;
  }
}

class CreateUserDTO {
  constructor({ name, email, password_hash, role }) {
    this.name = name;
    this.email = email;
    this.password_hash = password_hash;
    this.role = role || 'user';
  }
}

module.exports = { UserDTO, CreateUserDTO };
