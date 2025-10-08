const { getPool, sql } = require('../config/database');

class MenuItem {
  static async findAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT * FROM menu_items
        WHERE available = 1 AND deleted_at IS NULL
        ORDER BY category, name
      `);
    return result.recordset;
  }

  static async findById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM menu_items WHERE id = @id AND deleted_at IS NULL');
    return result.recordset[0];
  }

  static async create(itemData) {
    const { name, description, price, category, company, food_category, available = true, image_url } = itemData;
    const pool = await getPool();

    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description)
      .input('price', sql.Decimal(10, 2), price)
      .input('category', sql.NVarChar, category)
      .input('company', sql.NVarChar, company)
      .input('food_category', sql.NVarChar, food_category)
      .input('available', sql.Bit, available)
      .input('image_url', sql.NVarChar, image_url)
      .query(`
        INSERT INTO menu_items (name, description, price, category, company, food_category, available, image_url)
        OUTPUT INSERTED.*
        VALUES (@name, @description, @price, @category, @company, @food_category, @available, @image_url)
      `);

    return result.recordset[0];
  }

  static async update(id, itemData) {
    const { name, description, price, category, company, food_category, available, image_url } = itemData;
    const pool = await getPool();

    let query = 'UPDATE menu_items SET ';
    const updates = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, name);
    }
    if (description !== undefined) {
      updates.push('description = @description');
      request.input('description', sql.NVarChar, description);
    }
    if (price !== undefined) {
      updates.push('price = @price');
      request.input('price', sql.Decimal(10, 2), price);
    }
    if (category !== undefined) {
      updates.push('category = @category');
      request.input('category', sql.NVarChar, category);
    }
    if (company !== undefined) {
      updates.push('company = @company');
      request.input('company', sql.NVarChar, company);
    }
    if (food_category !== undefined) {
      updates.push('food_category = @food_category');
      request.input('food_category', sql.NVarChar, food_category);
    }
    if (available !== undefined) {
      updates.push('available = @available');
      request.input('available', sql.Bit, available);
    }
    if (image_url !== undefined) {
      updates.push('image_url = @image_url');
      request.input('image_url', sql.NVarChar, image_url);
    }

    query += updates.join(', ') + ' OUTPUT INSERTED.* WHERE id = @id AND deleted_at IS NULL';

    const result = await request.query(query);
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE menu_items SET deleted_at = GETDATE() WHERE id = @id');
  }

  static async findByCategory(category) {
    const pool = await getPool();
    const result = await pool.request()
      .input('category', sql.NVarChar, category)
      .query(`
        SELECT * FROM menu_items
        WHERE category = @category AND available = 1 AND deleted_at IS NULL
        ORDER BY name
      `);
    return result.recordset;
  }

  static async findByCompany(company) {
    const pool = await getPool();
    const result = await pool.request()
      .input('company', sql.NVarChar, company)
      .query(`
        SELECT * FROM menu_items
        WHERE company = @company AND available = 1 AND deleted_at IS NULL
        ORDER BY category, name
      `);
    return result.recordset;
  }
}

module.exports = MenuItem;
