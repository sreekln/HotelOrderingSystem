const pool = require('../config/database');

class MenuItem {
  static async findAll() {
    const query = `
      SELECT * FROM menu_items_with_company
      WHERE mi.available = true AND mi.deleted_at IS NULL
      ORDER BY mi.category, mi.name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT * FROM menu_items_with_company
      WHERE mi.id = $1 AND mi.deleted_at IS NULL
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(itemData) {
    const { name, description, price, category, company, tax_rate, food_category, available = true } = itemData;
    
    const query = `
      INSERT INTO menu_items (name, description, price, category, company, tax_rate, food_category, available)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, price, category, company, tax_rate, food_category, available]);
    return result.rows[0];
  }

  static async update(id, itemData) {
    const { name, description, price, category, company, tax_rate, food_category, available } = itemData;
    
    const query = `
      UPDATE menu_items 
      SET name = $1, description = $2, price = $3, category = $4, company = $5, 
          tax_rate = $6, food_category = $7, available = $8, updated_at = NOW()
      WHERE id = $9 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await pool.query(query, [name, description, price, category, company, tax_rate, food_category, available, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'UPDATE menu_items SET deleted_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async findByCategory(category) {
    const query = `
      SELECT * FROM menu_items_with_company
      WHERE category = $1 AND available = true AND deleted_at IS NULL
      ORDER BY name
    `;
    const result = await pool.query(query, [category]);
    return result.rows;
  }

  static async findByCompany(company) {
    const query = `
      SELECT * FROM menu_items_with_company
      WHERE company = $1 AND available = true AND deleted_at IS NULL
      ORDER BY category, name
    `;
    const result = await pool.query(query, [company]);
    return result.rows;
  }
}

module.exports = MenuItem;