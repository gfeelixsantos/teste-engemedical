import { NEST_URL } from '@/config/constants';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // NEST_URL já inclui a barra final — removemos a barra inicial de `url` se houver
  const baseUrl = NEST_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'Failed API call';
    try {
      const err = await response.json();
      errorMsg = err.message || errorMsg;
    } catch (e) {
      errorMsg = await response.text();
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const campaignsClient = {
  async getCampaigns() {
    return fetchWithAuth('/customer-email-campaigns');
  },
  
  async getCampaign(id: string) {
    return fetchWithAuth(`/customer-email-campaigns/${id}`);
  },

  async createDraft(payload: any) {
    return fetchWithAuth('/customer-email-campaigns', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCampaign(id: string, payload: any) {
    return fetchWithAuth(`/customer-email-campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async publishCampaign(id: string) {
    return fetchWithAuth(`/customer-email-campaigns/${id}/publish`, {
      method: 'POST'
    });
  },

  async cancelCampaign(id: string) {
    return fetchWithAuth(`/customer-email-campaigns/${id}/cancel`, {
      method: 'POST'
    });
  },

  async deleteCampaign(id: string) {
    return fetchWithAuth(`/customer-email-campaigns/${id}`, {
      method: 'DELETE'
    });
  },

  async getCampaignProgress(id: string) {
    return fetchWithAuth(`/customer-email-campaigns/${id}/progress`);
  },

  async getCompanies() {
    return fetchWithAuth(`/soc/empresas`);
  },

  async getAppUsers() {
    return fetchWithAuth(`/users`);
  }
};
