const pool = require('../config/database');

class PartOrder {
  static async create(partOrderData) {
    const { table_session_id, table_number, items, special_instructions } = partOrderData;
    
    const query = `
      INSERT INTO part_orders (table_session_id, table_number, items, special_instructions, status)
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING *
    `;
    
    const result = await pool.query(query, [table_session_id, table_number, JSON.stringify(items), special_instructions]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM part_orders WHERE 1=1';
    
    const params = [];
    let paramCount = 0;
    
    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.table_number) {
      paramCount++;
      query += ` AND table_number = $${paramCount}`;
      params.push(filters.table_number);
    }
    
    if (filters.table_session_id) {
      paramCount++;
      query += ` AND table_session_id = $${paramCount}`;
      params.push(filters.table_session_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM part_orders WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE part_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async markPrinted(id) {
    const query = 'UPDATE part_orders SET printed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, partOrderData) {
    const { items, special_instructions } = partOrderData;
    
    const query = `
      UPDATE part_orders 
      SET items = $1, special_instructions = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [JSON.stringify(items), special_instructions, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM part_orders WHERE id = $1';
    await pool.query(query, [id]);
  }

  static async findByTableSession(table_session_id) {
    const query = 'SELECT * FROM part_orders WHERE table_session_id = $1 ORDER BY created_at ASC';
    const result = await pool.query(query, [table_session_id]);
    return result.rows;
  }

  static async getKitchenQueue() {
    const query = `
      SELECT * FROM part_orders 
      WHERE status IN ('sent_to_kitchen', 'preparing') 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = PartOrder;