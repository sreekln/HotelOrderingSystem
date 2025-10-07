const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, full_name, role = 'server' }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, created_at
    `;
    
    const result = await pool.query(query, [email, hashedPassword, full_name, role]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1 AND deleted_at IS NULL';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(id) {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async getAllUsers() {
    const query = 'SELECT id, email, full_name, role, created_at, last_login FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateUser(id, userData) {
    const { full_name, role } = userData;
    const query = `
      UPDATE users 
      SET full_name = $1, role = $2, updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING id, email, full_name, role, created_at, updated_at
    `;
    const result = await pool.query(query, [full_name, role, id]);
    return result.rows[0];
  }

  static async deleteUser(id) {
    const query = 'UPDATE users SET deleted_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = User;