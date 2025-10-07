const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Auth endpoints
  async signUp(userData: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signIn(credentials: { email: string; password: string }) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Menu endpoints
  async getMenuItems() {
    return this.request('/menu');
  }

  async getMenuItem(id: string) {
    return this.request(`/menu/${id}`);
  }

  async createMenuItem(itemData: any) {
    return this.request('/menu', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateMenuItem(id: string, itemData: any) {
    return this.request(`/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deleteMenuItem(id: string) {
    return this.request(`/menu/${id}`, {
      method: 'DELETE',
    });
  }

  // Order endpoints
  async getOrders(filters?: { status?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    
    const endpoint = `/orders${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderData: any) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updatePaymentStatus(id: string, payment_status: string) {
    return this.request(`/orders/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status }),
    });
  }

  // Company endpoints
  async getCompanies() {
    return this.request('/companies');
  }

  async getCompany(id: string) {
    return this.request(`/companies/${id}`);
  }

  async createCompany(companyData: any) {
    return this.request('/companies', {
      method: 'POST',
      body: JSON.stringify(companyData),
    });
  }

  async updateCompany(id: string, companyData: any) {
    return this.request(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  }

  async deleteCompany(id: string) {
    return this.request(`/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // Table Session endpoints
  async getTableSessions(filters?: { status?: string; table_number?: number }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.table_number) params.append('table_number', filters.table_number.toString());
    
    const endpoint = `/table-sessions${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getTableSession(id: string) {
    return this.request(`/table-sessions/${id}`);
  }

  async createTableSession(sessionData: any) {
    return this.request('/table-sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async updateTableSessionStatus(id: string, status: string) {
    return this.request(`/table-sessions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateTableSessionPayment(id: string, payment_status: string) {
    return this.request(`/table-sessions/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status }),
    });
  }

  async getActiveTableSession(table_number: number) {
    return this.request(`/table-sessions/table/${table_number}/active`);
  }

  // Part Order endpoints
  async getPartOrders(filters?: { status?: string; table_number?: number; table_session_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.table_number) params.append('table_number', filters.table_number.toString());
    if (filters?.table_session_id) params.append('table_session_id', filters.table_session_id);
    
    const endpoint = `/part-orders${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getPartOrder(id: string) {
    return this.request(`/part-orders/${id}`);
  }

  async updatePartOrderStatus(id: string, status: string) {
    return this.request(`/part-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async markPartOrderPrinted(id: string) {
    return this.request(`/part-orders/${id}/print`, {
      method: 'PATCH',
    });
  }

  async updatePartOrder(id: string, partOrderData: any) {
    return this.request(`/part-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(partOrderData),
    });
  }

  async deletePartOrder(id: string) {
    return this.request(`/part-orders/${id}`, {
      method: 'DELETE',
    });
  }

  async getKitchenQueue() {
    return this.request('/part-orders/kitchen/queue');
  }

  async addPartOrderToSession(sessionId: string, partOrderData: any) {
    return this.request(`/table-sessions/${sessionId}/part-orders`, {
      method: 'POST',
      body: JSON.stringify(partOrderData),
    });
  }

  // Stripe endpoints
  async createCheckoutSession(params: any) {
    return this.request('/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createPaymentIntent(params: any) {
    return this.request('/stripe/payment-intent', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string) {
    return this.request('/stripe/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId,
      }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;