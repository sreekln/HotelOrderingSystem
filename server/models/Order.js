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
    let query = `
      SELECT o.*, u.full_name as customer_name,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menu_item_id', oi.menu_item_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'menu_item', json_build_object(
                   'id', mi.id,
                   'name', mi.name,
                   'description', mi.description,
                   'price', mi.price,
                   'category', mi.category,
                   'company', mi.company,
                   'tax_rate', mi.tax_rate,
                   'food_category', mi.food_category
                 )
               )
             ) as order_items
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.deleted_at IS NULL
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (filters.status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.customer_id) {
      paramCount++;
      query += ` AND o.customer_id = $${paramCount}`;
      params.push(filters.customer_id);
    }
    
    query += ` GROUP BY o.id, u.full_name ORDER BY o.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT o.*, u.full_name as customer_name,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menu_item_id', oi.menu_item_id,
                 'quantity', oi.quantity,
                 'price', oi.price,
                 'menu_item', json_build_object(
                   'id', mi.id,
                   'name', mi.name,
                   'description', mi.description,
                   'price', mi.price,
                   'category', mi.category,
                   'company', mi.company,
                   'tax_rate', mi.tax_rate,
                   'food_category', mi.food_category
                 )
               )
             ) as order_items
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = $1 AND o.deleted_at IS NULL
      GROUP BY o.id, u.full_name
    `;
    
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
}

module.exports = Order;