const { getPool, sql } = require('../config/database');

class TableSession {
  static async create(sessionData) {
    const { table_number, server_id } = sessionData;
    const pool = await getPool();

    const result = await pool.request()
      .input('table_number', sql.Int, table_number)
      .input('server_id', sql.UniqueIdentifier, server_id)
      .query(`
        INSERT INTO table_sessions (table_number, server_id, status, payment_status)
        OUTPUT INSERTED.*
        VALUES (@table_number, @server_id, 'active', 'pending')
      `);

    return result.recordset[0];
  }

  static async findAll(filters = {}) {
    const pool = await getPool();
    let query = 'SELECT * FROM table_sessions WHERE 1=1';
    const request = pool.request();

    if (filters.status) {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, filters.status);
    }

    if (filters.table_number) {
      query += ' AND table_number = @table_number';
      request.input('table_number', sql.Int, filters.table_number);
    }

    query += ' ORDER BY created_at DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  static async findById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM table_sessions WHERE id = @id');

    return result.recordset[0];
  }

  static async findByTableNumber(table_number) {
    const pool = await getPool();
    const result = await pool.request()
      .input('table_number', sql.Int, table_number)
      .query(`
        SELECT TOP 1 * FROM table_sessions
        WHERE table_number = @table_number AND status = 'active'
        ORDER BY created_at DESC
      `);

    return result.recordset[0];
  }

  static async updateStatus(id, status) {
    const pool = await getPool();
    const request = pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status);

    let query = 'UPDATE table_sessions SET status = @status';

    if (status === 'closed') {
      query += ', closed_at = GETDATE()';
    }

    query += ' OUTPUT INSERTED.* WHERE id = @id';

    const result = await request.query(query);
    return result.recordset[0];
  }

  static async updatePaymentStatus(id, payment_status) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('payment_status', sql.NVarChar, payment_status)
      .query(`
        UPDATE table_sessions SET payment_status = @payment_status
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    return result.recordset[0];
  }

  static async updateTotal(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE ts
        SET ts.total_amount = (
          SELECT ISNULL(SUM(poi.subtotal), 0)
          FROM part_orders po
          JOIN part_order_items poi ON po.id = poi.part_order_id
          WHERE po.table_session_id = @id
        )
        OUTPUT INSERTED.*
        FROM table_sessions ts
        WHERE ts.id = @id
      `);

    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM table_sessions WHERE id = @id');
  }
}

module.exports = TableSession;
