const pool = require('../config/database');

class TableSession {
  static async create(sessionData) {
    const { table_number, customer_name } = sessionData;
    
    const query = `
      INSERT INTO table_sessions (table_number, customer_name, status)
      VALUES ($1, $2, 'active')
      RETURNING *
    `;
    
    const result = await pool.query(query, [table_number, customer_name]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT ts.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', po.id,
                   'table_number', po.table_number,
                   'items', po.items,
                   'special_instructions', po.special_instructions,
                   'status', po.status,
                   'created_at', po.created_at,
                   'updated_at', po.updated_at,
                   'printed_at', po.printed_at
                 )
               ) FILTER (WHERE po.id IS NOT NULL), 
               '[]'::json
             ) as part_orders
      FROM table_sessions ts
      LEFT JOIN part_orders po ON ts.id = po.table_session_id
      WHERE ts.deleted_at IS NULL
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.status) {
      paramCount++;
      query += ` AND ts.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.table_number) {
      paramCount++;
      query += ` AND ts.table_number = $${paramCount}`;
      params.push(filters.table_number);
    }
    
    query += ` GROUP BY ts.id ORDER BY ts.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT ts.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', po.id,
                   'table_number', po.table_number,
                   'items', po.items,
                   'special_instructions', po.special_instructions,
                   'status', po.status,
                   'created_at', po.created_at,
                   'updated_at', po.updated_at,
                   'printed_at', po.printed_at
                 )
               ) FILTER (WHERE po.id IS NOT NULL), 
               '[]'::json
             ) as part_orders
      FROM table_sessions ts
      LEFT JOIN part_orders po ON ts.id = po.table_session_id
      WHERE ts.id = $1 AND ts.deleted_at IS NULL
      GROUP BY ts.id
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByTableNumber(table_number) {
    const query = `
      SELECT ts.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', po.id,
                   'table_number', po.table_number,
                   'items', po.items,
                   'special_instructions', po.special_instructions,
                   'status', po.status,
                   'created_at', po.created_at,
                   'updated_at', po.updated_at,
                   'printed_at', po.printed_at
                 )
               ) FILTER (WHERE po.id IS NOT NULL), 
               '[]'::json
             ) as part_orders
      FROM table_sessions ts
      LEFT JOIN part_orders po ON ts.id = po.table_session_id
      WHERE ts.table_number = $1 AND ts.deleted_at IS NULL AND ts.status = 'active'
      GROUP BY ts.id
      ORDER BY ts.created_at DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [table_number]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE table_sessions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async updatePaymentStatus(id, payment_status) {
    const query = 'UPDATE table_sessions SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [payment_status, id]);
    return result.rows[0];
  }

  static async updateTotal(id) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Use the database function to update the total
      await client.query('SELECT update_table_session_total($1)', [id]);
      
      // Get the updated session
      const result = await client.query('SELECT * FROM table_sessions WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const query = 'UPDATE table_sessions SET deleted_at = NOW() WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = TableSession;