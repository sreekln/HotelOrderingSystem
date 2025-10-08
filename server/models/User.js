const { getPool, sql } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ email, password, full_name, role = 'server' }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('password_hash', sql.NVarChar, hashedPassword)
      .input('full_name', sql.NVarChar, full_name)
      .input('role', sql.NVarChar, role)
      .query(`
        INSERT INTO users (email, password_hash, full_name, role)
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name, INSERTED.role, INSERTED.created_at
        VALUES (@email, @password_hash, @full_name, @role)
      `);

    return result.recordset[0];
  }

  static async findByEmail(email) {
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email AND deleted_at IS NULL');

    return result.recordset[0];
  }

  static async findById(id) {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, email, full_name, role, created_at FROM users WHERE id = @id AND deleted_at IS NULL');

    return result.recordset[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(id) {
    const pool = await getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE users SET last_login = GETDATE() WHERE id = @id');
  }

  static async getAllUsers() {
    const pool = await getPool();

    const result = await pool.request()
      .query('SELECT id, email, full_name, role, created_at, last_login FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC');

    return result.recordset;
  }

  static async updateUser(id, userData) {
    const { full_name, role } = userData;
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('full_name', sql.NVarChar, full_name)
      .input('role', sql.NVarChar, role)
      .query(`
        UPDATE users
        SET full_name = @full_name, role = @role
        OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name, INSERTED.role, INSERTED.created_at, INSERTED.updated_at
        WHERE id = @id AND deleted_at IS NULL
      `);

    return result.recordset[0];
  }

  static async deleteUser(id) {
    const pool = await getPool();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE users SET deleted_at = GETDATE() WHERE id = @id');
  }
}

module.exports = User;
