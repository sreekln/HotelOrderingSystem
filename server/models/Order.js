const { getPool, sql } = require('../config/database');

class Order {
  static async create(orderData) {
    const { user_id, table_number, notes, items } = orderData;
    const pool = await getPool();
    const transaction = pool.transaction();

    try {
      await transaction.begin();

      let total_amount = 0;
      for (const item of items) {
        total_amount += item.unit_price * item.quantity;
      }

      const orderResult = await transaction.request()
        .input('user_id', sql.UniqueIdentifier, user_id)
        .input('table_number', sql.Int, table_number)
        .input('total_amount', sql.Decimal(10, 2), total_amount)
        .input('notes', sql.NVarChar, notes)
        .query(`
          INSERT INTO orders (user_id, table_number, total_amount, notes, status, payment_status)
          OUTPUT INSERTED.*
          VALUES (@user_id, @table_number, @total_amount, @notes, 'pending', 'pending')
        `);

      const order = orderResult.recordset[0];

      if (items && items.length > 0) {
        for (const item of items) {
          await transaction.request()
            .input('order_id', sql.UniqueIdentifier, order.id)
            .input('menu_item_id', sql.UniqueIdentifier, item.menu_item_id)
            .input('quantity', sql.Int, item.quantity)
            .input('unit_price', sql.Decimal(10, 2), item.unit_price)
            .input('subtotal', sql.Decimal(10, 2), item.unit_price * item.quantity)
            .input('special_instructions', sql.NVarChar, item.special_instructions)
            .query(`
              INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal, special_instructions)
              VALUES (@order_id, @menu_item_id, @quantity, @unit_price, @subtotal, @special_instructions)
            `);
        }
      }

      await transaction.commit();
      return order;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async findAll(filters = {}) {
    const pool = await getPool();
    let query = 'SELECT * FROM orders WHERE deleted_at IS NULL';
    const request = pool.request();

    if (filters.status) {
      query += ' AND status = @status';
      request.input('status', sql.NVarChar, filters.status);
    }

    if (filters.user_id) {
      query += ' AND user_id = @user_id';
      request.input('user_id', sql.UniqueIdentifier, filters.user_id);
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
        SELECT o.*,
          (SELECT oi.*, mi.name as menu_item_name, mi.price as menu_item_price
           FROM order_items oi
           JOIN menu_items mi ON oi.menu_item_id = mi.id
           WHERE oi.order_id = o.id
           FOR JSON PATH) as items
        FROM orders o
        WHERE o.id = @id AND o.deleted_at IS NULL
      `);

    if (result.recordset[0]) {
      const order = result.recordset[0];
      if (order.items) {
        order.items = JSON.parse(order.items);
      }
      return order;
    }
    return null;
  }

  static async updateStatus(id, status) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, status)
      .query('UPDATE orders SET status = @status OUTPUT INSERTED.* WHERE id = @id');

    return result.recordset[0];
  }

  static async updatePaymentStatus(id, payment_status) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('payment_status', sql.NVarChar, payment_status)
      .query('UPDATE orders SET payment_status = @payment_status OUTPUT INSERTED.* WHERE id = @id');

    return result.recordset[0];
  }

  static async getOrdersByDateRange(startDate, endDate) {
    const pool = await getPool();
    const result = await pool.request()
      .input('startDate', sql.DateTime2, startDate)
      .input('endDate', sql.DateTime2, endDate)
      .query(`
        SELECT * FROM orders
        WHERE deleted_at IS NULL AND created_at >= @startDate AND created_at <= @endDate
        ORDER BY created_at DESC
      `);

    return result.recordset;
  }

  static async getOrderStats() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT
          COUNT(*) as total_orders,
          ISNULL(SUM(total_amount), 0) as total_revenue,
          ISNULL(AVG(total_amount), 0) as average_order_value,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders
        FROM orders
        WHERE deleted_at IS NULL
      `);

    return result.recordset[0];
  }
}

module.exports = Order;
