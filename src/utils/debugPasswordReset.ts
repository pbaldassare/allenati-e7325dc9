// Debug utility for password reset functionality
export const debugPasswordReset = {
  logUrlParams: (searchParams: URLSearchParams) => {
    const allParams = Object.fromEntries(searchParams);
    console.group('🔍 Password Reset Debug');
    console.log('All URL parameters:', allParams);
    
    // Check for different parameter formats
    const formats = {
      'Standard Supabase': {
        access_token: searchParams.get('access_token'),
        refresh_token: searchParams.get('refresh_token'),
        type: searchParams.get('type')
      },
      'OTP Format': {
        token_hash: searchParams.get('token_hash'),
        type: searchParams.get('type')
      },
      'Plain Token': {
        token: searchParams.get('token'),
        type: searchParams.get('type')
      },
      'Alternative': {
        code: searchParams.get('code'),
        email: searchParams.get('email')
      }
    };
    
    Object.entries(formats).forEach(([formatName, params]) => {
      const hasRequiredParams = Object.values(params).some(value => value !== null);
      console.log(`${formatName}:`, params, hasRequiredParams ? '✅' : '❌');
    });
    
    console.groupEnd();
    return allParams;
  },

  validateTokenFormat: (token: string) => {
    if (!token) return { valid: false, reason: 'Token is empty' };
    
    // Basic token validation
    if (token.length < 10) return { valid: false, reason: 'Token too short' };
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) return { valid: false, reason: 'Invalid token characters' };
    
    return { valid: true, reason: 'Token format appears valid' };
  },

  getResetMethod: (searchParams: URLSearchParams) => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const tokenHash = searchParams.get('token_hash');
    const token = searchParams.get('token');
    const type = searchParams.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      return { method: 'session', priority: 1, params: { accessToken, refreshToken, type } };
    }
    
    if (tokenHash && type === 'recovery') {
      return { method: 'token_hash', priority: 2, params: { tokenHash, type } };
    }
    
    if (token && type === 'recovery') {
      return { method: 'plain_token', priority: 3, params: { token, type } };
    }

    return { method: 'none', priority: 0, params: {} };
  }
};