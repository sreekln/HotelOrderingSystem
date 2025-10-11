const { getPool, sql } = require('../config/database');

class PartOrder {
  static async create(partOrderData) {
    const { table_session_id, server_id, table_number, items } = partOrderData;
    const pool = await getPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      const poResult = await transaction.request()
        .input('table_session_id', sql.UniqueIdentifier, table_session_id)
        .input('server_id', sql.UniqueIdentifier, server_id)
        .input('table_number', sql.Int, table_number)
        .query(`
          INSERT INTO part_orders (table_session_id, server_id, table_number, status)
          OUTPUT INSERTED.*
          VALUES (@table_session_id, @server_id, @table_number, 'draft')
        `);

      const partOrder = poResult.recordset[0];

      if (items && items.length > 0) {
        for (const item of items) {
          await transaction.request()
            .input('part_order_id', sql.UniqueIdentifier, partOrder.id)
            .input('menu_item_id', sql.UniqueIdentifier, item.menu_item_id)
            .input('quantity', sql.Int, item.quantity)
            .input('unit_price', sql.Decimal(10, 2), item.unit_price)
            .input('subtotal', sql.Decimal(10, 2), item.unit_price * item.quantity)
            .input('special_instructions', sql.NVarChar, item.special_instructions)
            .query(`
              INSERT INTO part_order_items (part_order_id, menu_item_id, quantity, unit_price, subtotal, special_instructions)
              VALUES (@part_order_id, @menu_item_id, @quantity, @unit_price, @subtotal, @special_instructions)
            `);
        }
      }

      await transaction.commit();
      return partOrder;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async findAll(filters = {}) {
    const pool = await getPool();
    let query = 'SELECT * FROM part_orders WHERE 1=1';
    const request = pool.request();

    if (filters.status) {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, filters.status);
    }

    if (filters.table_number) {
      query += ' AND table_number = @table_number';
      request.input('table_number', sql.Int, filters.table_number);
    }

    if (filters.table_session_id) {
      query += ' AND table_session_id = @table_session_id';
      request.input('table_session_id', sql.UniqueIdentifier, filters.table_session_id);
    }

    query += ' ORDER BY created_at DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  static async findById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT po.*,
          (SELECT poi.*, mi.name as menu_item_name, mi.price as menu_item_price
           FROM part_order_items poi
           JOIN menu_items mi ON poi.menu_item_id = mi.id
           WHERE poi.part_order_id = po.id
           FOR JSON PATH) as items
        FROM part_orders po
        WHERE po.id = @id
      `);

    if (result.recordset[0]) {
      const partOrder = result.recordset[0];
      if (partOrder.items) {
        partOrder.items = JSON.parse(partOrder.items);
      }
      return partOrder;
    }
    return null;
  }

  static async updateStatus(id, status) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE part_orders SET status = @status OUTPUT INSERTED.* WHERE id = @id');

    return result.recordset[0];
  }

  static async markPrinted(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('UPDATE part_orders SET printed_at = GETDATE() OUTPUT INSERTED.* WHERE id = @id');

    return result.recordset[0];
  }

  static async update(id, partOrderData) {
    const result = await this.findById(id);
    return result;
  }

  static async delete(id) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM part_orders WHERE id = @id');
  }

  static async findByTableSession(table_session_id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('table_session_id', sql.UniqueIdentifier, table_session_id)
      .query('SELECT * FROM part_orders WHERE table_session_id = @table_session_id ORDER BY created_at ASC');

    return result.recordset;
  }

  static async getKitchenQueue() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT * FROM part_orders
        WHERE status IN ('sent_to_kitchen', 'preparing')
        ORDER BY created_at ASC
      `);

    return result.recordset;
  }
}

module.exports = PartOrder;
