const pool = require('../config/database');

class Company {
  static async findAll() {
    const query = `
      SELECT * FROM companies 
      WHERE deleted_at IS NULL 
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByName(name) {
    const query = 'SELECT * FROM companies WHERE name = $1 AND deleted_at IS NULL';
    const result = await pool.query(query, [name]);
    return result.rows[0];
  }

  static async create(companyData) {
    const { name, category, contact_email, phone, address } = companyData;
    
    const query = `
      INSERT INTO companies (name, category, contact_email, phone, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, category, contact_email, phone, address]);
    return result.rows[0];
  }

  static async update(id, companyData) {
    const { name, category, contact_email, phone, address } = companyData;
    
    const query = `
      UPDATE companies 
      SET name = $1, category = $2, contact_email = $3, phone = $4, address = $5, updated_at = NOW()
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, category, contact_email, phone, address, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'UPDATE companies SET deleted_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async findByCategory(category) {
    const query = `
      SELECT * FROM companies 
      WHERE category = $1 AND deleted_at IS NULL 
      ORDER BY name
    `;
    const result = await pool.query(query, [category]);
    return result.rows;
  }
}

module.exports = Company;