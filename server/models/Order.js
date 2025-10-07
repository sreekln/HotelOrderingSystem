const pool = require('../config/database');

class Order {
  static async create(orderData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { customer_id, table_number, special_instructions, items } = orderData;
      
      // Calculate totals
      let subtotal = 0;
      let tax_amount = 0;
      
      for (const item of items) {
        const itemSubtotal = item.price * item.quantity;
        const itemTax = itemSubtotal * (item.tax_rate / 100);
        subtotal += itemSubtotal;
        tax_amount += itemTax;
      }
      
      const total_amount = subtotal + tax_amount;
      
      // Create order
      const orderQuery = `
        INSERT INTO orders (customer_id, subtotal, tax_amount, total_amount, status, payment_status, special_instructions, table_number)
        VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, $6)
        RETURNING *
      `;
      
      const orderResult = await client.query(orderQuery, [customer_id, subtotal, tax_amount, total_amount, special_instructions, table_number]);
      const order = orderResult.rows[0];
      
      // Create order items
      for (const item of items) {
        const itemQuery = `
          INSERT INTO order_items (order_id, menu_item_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(itemQuery, [order.id, item.menu_item_id, item.quantity, item.price]);
      }
      
      await client.query('COMMIT');
      return order;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM order_details WHERE 1=1';
    
    const params = [];
    let paramCount = 0;
    
    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.customer_id) {
      paramCount++;
      query += ` AND customer_id = $${paramCount}`;
      params.push(filters.customer_id);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM order_details WHERE id = $1';
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async updatePaymentStatus(id, payment_status) {
    const query = 'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [payment_status, id]);
    return result.rows[0];
  }

  static async getOrdersByDateRange(startDate, endDate) {
    const query = `
      SELECT * FROM order_details 
      WHERE created_at >= $1 AND created_at <= $2 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  static async getOrderStats() {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
      FROM orders 
      WHERE deleted_at IS NULL
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = Order;