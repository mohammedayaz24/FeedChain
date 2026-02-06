const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const DEMO_MODE = true; // TEMPORARY: Set to false to use real API

const STORAGE_FOOD_POSTS = 'feedchain_food_posts';
const STORAGE_CLAIMS = 'feedchain_claims';

function getToken(): string | null {
  return localStorage.getItem('feedchain_token');
}

function getCurrentUser() {
  try {
    const user = localStorage.getItem('feedchain_user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

// Helper functions for localStorage-based mock data
function getStorageFoodPosts(): FoodPost[] {
  try {
    const data = localStorage.getItem(STORAGE_FOOD_POSTS);
    return data ? JSON.parse(data) : getInitialFoodPosts();
  } catch {
    return getInitialFoodPosts();
  }
}

function getInitialFoodPosts(): FoodPost[] {
  return [
    {
      id: 'mock-post-1',
      donor_id: 'demo-0000-0000-0000-000000000000',
      food_type: 'Pizza',
      quantity: '5 boxes',
      expiry_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      pickup_lat: 12.9716,
      pickup_lng: 77.5946,
      status: 'posted',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-post-2',
      donor_id: 'demo-0000-0000-0000-000000000000',
      food_type: 'Rice & Vegetables',
      quantity: '10 kg',
      expiry_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      pickup_lat: 12.9352,
      pickup_lng: 77.6245,
      status: 'picked',
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      claimed_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      picked_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-post-3',
      donor_id: 'donor-other-0000-0000-0000-000000000001',
      food_type: 'Bread & Milk',
      quantity: '20 units',
      expiry_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      pickup_lat: 13.0827,
      pickup_lng: 77.5033,
      status: 'posted',
      created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-post-4',
      donor_id: 'donor-other-0000-0000-0000-000000000002',
      food_type: 'Cooked Meals',
      quantity: '50 servings',
      expiry_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      pickup_lat: 12.9689,
      pickup_lng: 77.6348,
      status: 'distributed',
      created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      claimed_at: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
      picked_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      distributed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  ];
}

function saveStorageFoodPosts(posts: FoodPost[]): void {
  localStorage.setItem(STORAGE_FOOD_POSTS, JSON.stringify(posts));
}

function getStorageClaims(): Claim[] {
  try {
    const data = localStorage.getItem(STORAGE_CLAIMS);
    return data ? JSON.parse(data) : getInitialClaims();
  } catch {
    return getInitialClaims();
  }
}

function getInitialClaims(): Claim[] {
  return [
    {
      id: 'mock-claim-1',
      food_post_id: 'mock-post-2',
      ngo_id: 'ngo-demo-0000-0000-0000-0000000000000',
      status: 'picked',
      claimed_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      picked_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-claim-2',
      food_post_id: 'mock-post-3',
      ngo_id: 'ngo-other-0000-0000-0000-00000000000001',
      status: 'claimed',
      claimed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock-claim-3',
      food_post_id: 'mock-post-4',
      ngo_id: 'ngo-demo-0000-0000-0000-0000000000000',
      status: 'distributed',
      claimed_at: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
      picked_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      distributed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      distribution_form: {
        distribution_location: 'Shelter A - Downtown',
        people_fed: 45,
        distribution_date: new Date(Date.now() - 60 * 60 * 1000).toISOString().split('T')[0],
        distribution_time: '14:30',
        impact_note: 'Successfully distributed meals to 45 beneficiaries including families and individuals in need.',
      },
    },
  ];
}

function saveStorageClaims(claims: Claim[]): void {
  localStorage.setItem(STORAGE_CLAIMS, JSON.stringify(claims));
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // In demo mode, handle mock data with localStorage persistence
  if (DEMO_MODE && path !== '/auth/register' && path !== '/auth/login') {
    const currentUser = getCurrentUser();
    const userId = currentUser?.user_id || 'demo-0000-0000-0000-000000000000';
    const userRole = currentUser?.role || 'donor';

    // Handle /auth/me
    if (path === '/auth/me') {
      return currentUser || { user_id: userId, role: userRole } as T;
    }

    // Handle /food-posts/my - return posts based on role
    if (path === '/food-posts/my') {
      const allPosts = getStorageFoodPosts();
      if (userRole === 'donor') {
        // Donors see their own posts (all statuses)
        return allPosts.filter(p => p.donor_id === userId) as T;
      } else if (userRole === 'ngo') {
        // NGOs see posted posts (posted status)
        return allPosts.filter(p => p.status === 'posted') as T;
      }
      return allPosts as T;
    }

    // Handle /food-posts/nearby
    if (path.startsWith('/food-posts/nearby')) {
      const allPosts = getStorageFoodPosts();
      return allPosts.filter(p => p.status === 'posted') as T;
    }

    // Handle /food-posts/{id} create
    if (path === '/food-posts' && options.method === 'POST') {
      const body = JSON.parse(options.body as string);
      const newPost: FoodPost = {
        id: `post-${Date.now()}`,
        donor_id: userId,
        food_type: body.food_type,
        quantity: body.quantity,
        expiry_time: body.expiry_time,
        pickup_lat: body.pickup_lat,
        pickup_lng: body.pickup_lng,
        status: 'posted',
        created_at: new Date().toISOString(),
      };
      const allPosts = getStorageFoodPosts();
      allPosts.push(newPost);
      saveStorageFoodPosts(allPosts);
      return newPost as T;
    }

    // Handle /claims/my - return claims based on role
    if (path === '/claims/my') {
      const allClaims = getStorageClaims();
      const allPosts = getStorageFoodPosts();
      
      if (userRole === 'donor') {
        // Donors see claims on their posts
        return allClaims.filter(claim => {
          const post = allPosts.find(p => p.id === claim.food_post_id);
          return post?.donor_id === userId;
        }).map(claim => ({
          ...claim,
          food_posts: allPosts.find(p => p.id === claim.food_post_id)
        })) as T;
      } else if (userRole === 'ngo') {
        // NGOs see their own claims
        return allClaims.filter(c => c.ngo_id === userId).map(claim => ({
          ...claim,
          food_posts: allPosts.find(p => p.id === claim.food_post_id)
        })) as T;
      }
      return allClaims as T;
    }

    // Handle /food-posts/{id}/claim
    if (path.includes('/claim') && options.method === 'POST') {
      const postId = path.split('/')[2];
      const allPosts = getStorageFoodPosts();
      const post = allPosts.find(p => p.id === postId);
      
      if (post && post.status === 'posted') {
        post.status = 'claimed';
        post.claimed_at = new Date().toISOString();
        saveStorageFoodPosts(allPosts);
        
        const newClaim: Claim = {
          id: `claim-${Date.now()}`,
          food_post_id: postId,
          ngo_id: userId,
          status: 'claimed',
          claimed_at: new Date().toISOString(),
          food_posts: post,
        };
        const allClaims = getStorageClaims();
        allClaims.push(newClaim);
        saveStorageClaims(allClaims);
        
        return { message: 'Food post claimed successfully' } as T;
      }
      throw new Error('Post not available for claiming');
    }

    // Handle /claims/{id}/pickup
    if (path.includes('/pickup') && options.method === 'POST') {
      const claimId = path.split('/')[2];
      const allClaims = getStorageClaims();
      const claim = allClaims.find(c => c.id === claimId);
      
      if (claim && claim.status === 'claimed') {
        claim.status = 'picked';
        claim.picked_at = new Date().toISOString();
        
        // Update post status
        const allPosts = getStorageFoodPosts();
        const post = allPosts.find(p => p.id === claim.food_post_id);
        if (post) {
          post.status = 'picked';
          post.picked_at = new Date().toISOString();
          saveStorageFoodPosts(allPosts);
        }
        
        saveStorageClaims(allClaims);
        return { message: 'Food picked successfully', otp_for_demo: '123456' } as T;
      }
      throw new Error('Claim not in claimed state');
    }

    // Handle /claims/{id}/verify
    if (path.includes('/verify') && options.method === 'POST') {
      return { message: 'OTP verified successfully' } as T;
    }

    // Handle /claims/{id}/distribute - MANDATORY distribution form
    if (path.includes('/distribute') && options.method === 'POST') {
      const claimId = path.split('/')[2];
      const body = JSON.parse(options.body as string);
      
      // Validate required fields
      if (!body.distribution_location || !body.people_fed) {
        throw new Error('Distribution location and number of people fed are mandatory');
      }
      
      const allClaims = getStorageClaims();
      const claim = allClaims.find(c => c.id === claimId);
      
      if (claim && claim.status === 'picked') {
        claim.status = 'distributed';
        claim.distributed_at = new Date().toISOString();
        claim.distribution_form = {
          distribution_location: body.distribution_location,
          people_fed: body.people_fed,
          distribution_date: body.distribution_date || new Date().toISOString().split('T')[0],
          distribution_time: body.distribution_time,
          impact_note: body.impact_note,
          proof_image: body.proof_image,
        };
        
        // Update post status
        const allPosts = getStorageFoodPosts();
        const post = allPosts.find(p => p.id === claim.food_post_id);
        if (post) {
          post.status = 'distributed';
          post.distributed_at = new Date().toISOString();
          saveStorageFoodPosts(allPosts);
        }
        
        saveStorageClaims(allClaims);
        return { message: 'Distribution recorded successfully' } as T;
      }
      throw new Error('Claim not in picked state');
    }

    // Handle /impact/summary
    if (path === '/impact/summary') {
      const allClaims = getStorageClaims();
      const distributedClaims = allClaims.filter(c => c.status === 'distributed');
      const peopleServed = distributedClaims.reduce((sum, c) => sum + (c.distribution_form?.people_fed || 0), 0);
      const uniqueNgos = new Set(allClaims.map(c => c.ngo_id)).size;
      
      return {
        meals_served: peopleServed,
        active_ngos: uniqueNgos,
        successful_distributions: distributedClaims.length,
      } as T;
    }

    // Handle /admin/overview
    if (path === '/admin/overview') {
      return {
        food_posts: getStorageFoodPosts(),
        claims: getStorageClaims(),
      } as T;
    }

    // Return empty array or object for other GET requests
    if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
      return [] as T;
    }
    // Return success for mutations
    return { message: 'Success (demo mode)' } as T;
  }

  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('feedchain_token');
    localStorage.removeItem('feedchain_user');
    window.dispatchEvent(new Event('feedchain_unauthorized'));
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(res.ok ? text : `Request failed: ${res.status}`);
  }

  if (!res.ok) {
    const detail = typeof (data as { detail?: string })?.detail === 'string'
      ? (data as { detail: string }).detail
      : JSON.stringify((data as { detail?: unknown })?.detail ?? 'Request failed');
    throw new Error(detail);
  }

  return data as T;
}

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
  role: 'donor' | 'ngo' | 'admin';
};

export type User = { user_id: string; role: 'donor' | 'ngo' | 'admin' };

export type FoodPost = {
  id: string;
  donor_id: string;
  food_type: string;
  quantity: string;
  expiry_time: string;
  pickup_lat?: number;
  pickup_lng?: number;
  status: 'posted' | 'claimed' | 'picked' | 'distributed';
  created_at?: string;
  claimed_at?: string;
  picked_at?: string;
  distributed_at?: string;
};

export type DistributionForm = {
  distribution_location: string;
  people_fed: number;
  distribution_date?: string;
  distribution_time?: string;
  impact_note?: string;
  proof_image?: string;
};

export type Claim = {
  id: string;
  food_post_id: string;
  ngo_id: string;
  status: 'claimed' | 'picked' | 'distributed';
  claimed_at: string;
  picked_at?: string;
  distributed_at?: string;
  distribution_form?: DistributionForm;
  food_posts?: FoodPost | FoodPost[] | null;
};

export type ImpactSummary = {
  meals_served: number;
  active_ngos: number;
  successful_distributions: number;
};

export type RegisterResponse = {
  message: string;
  user_id: string;
  email: string;
  role: string;
};

export const auth = {
  register: (body: { email: string; password: string; role: 'donor' | 'ngo' | 'admin' }) =>
    api<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  loginWithPassword: (email: string, password: string) =>
    api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  loginWithRole: (role: 'donor' | 'ngo' | 'admin') =>
    api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  me: () => api<User>('/auth/me'),
};

export const foodPosts = {
  create: (body: {
    food_type: string;
    quantity: string;
    expiry_time: string;
    pickup_lat?: number;
    pickup_lng?: number;
  }) => api<FoodPost>('/food-posts', { method: 'POST', body: JSON.stringify(body) }),
  my: () => api<FoodPost[]>('/food-posts/my'),
  get: (id: string) => api<FoodPost>(`/food-posts/${id}`),
  nearby: (lat: number, lng: number) =>
    api<FoodPost[]>(
      `/food-posts/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
    ),
};

export const claims = {
  claim: (postId: string) =>
    api<{ message: string }>(`/food-posts/${postId}/claim`, { method: 'POST' }),
  my: () => api<Claim[]>('/claims/my'),
  cancel: (claimId: string) =>
    api<{ message: string }>(`/claims/${claimId}/cancel`, { method: 'POST' }),
  pickup: (claimId: string) =>
    api<{ message: string; otp_for_demo?: string }>(
      `/claims/${claimId}/pickup`,
      { method: 'POST' }
    ),
  verify: (claimId: string, otp: string) =>
    api<{ message: string }>(`/claims/${claimId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),
};

export const distribution = {
  distribute: (
    claimId: string,
    body: Partial<DistributionForm>
  ) =>
    api<{ message: string }>(`/claims/${claimId}/distribute`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const impact = {
  summary: () => api<ImpactSummary>('/impact/summary'),
};

export const admin = {
  overview: () =>
    api<{ food_posts: FoodPost[]; claims: Claim[] }>('/admin/overview'),
};
