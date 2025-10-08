const { getPool, sql } = require('../config/database');

class Company {
  static async findAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM companies WHERE deleted_at IS NULL ORDER BY name');
    return result.recordset;
  }

  static async findById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM companies WHERE id = @id AND deleted_at IS NULL');
    return result.recordset[0];
  }

  static async findByName(name) {
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('SELECT * FROM companies WHERE name = @name AND deleted_at IS NULL');
    return result.recordset[0];
  }

  static async create(companyData) {
    const { name, category, contact_email, phone, address } = companyData;
    const pool = await getPool();

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('category', sql.NVarChar, category)
      .input('contact_email', sql.NVarChar, contact_email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .query(`
        INSERT INTO companies (name, category, contact_email, phone, address)
        OUTPUT INSERTED.*
        VALUES (@name, @category, @contact_email, @phone, @address)
      `);

    return result.recordset[0];
  }

  static async update(id, companyData) {
    const { name, category, contact_email, phone, address } = companyData;
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('name', sql.NVarChar, name)
      .input('category', sql.NVarChar, category)
      .input('contact_email', sql.NVarChar, contact_email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .query(`
        UPDATE companies
        SET name = @name, category = @category, contact_email = @contact_email, phone = @phone, address = @address
        OUTPUT INSERTED.*
        WHERE id = @id AND deleted_at IS NULL
      `);

    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE companies SET deleted_at = GETDATE() WHERE id = @id');
  }

  static async findByCategory(category) {
    const pool = await getPool();
    const result = await pool.request()
      .input('category', sql.NVarChar, category)
      .query('SELECT * FROM companies WHERE category = @category AND deleted_at IS NULL ORDER BY name');
    return result.recordset;
  }
}

module.exports = Company;
