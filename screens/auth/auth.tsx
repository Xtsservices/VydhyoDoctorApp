import axios from 'axios';

// const BASE_URL = "http://vitals-backend-app-env.eba-2zkpksar.ap-south-1.elasticbeanstalk.com/api/v1";
// const BASE_URL = 'http://216.10.251.239:3000';
const BASE_URL = 'http://216.10.251.239:3000';


// Common error handling function
const handleError = (err: any) => {
    console.error('API Error:', err);
  if (err?.response?.data?.message) {
    return { message: err.response.data.message, status: 'error' };
  } else if (err?.response?.data?.error) {
    return { message: err.response.data.error, status: 'error' };
  }
  return { message: 'Something went wrong', status: 'error' };
};

// Common API function
interface ApiRequestParams {
  url: string;
  method?: string;
  data?: any;
  token?: string | null | undefined;
  contentType?: string;
}

export async function apiRequest({ 
  url, 
  method = 'get', 
  data = null, 
  token = null as string | null | undefined, 
  contentType = 'application/json' 
}: ApiRequestParams) {
  try {
    const fullUrl =`${BASE_URL}/${url}`;
    console.log("data",fullUrl)
    const config = {
      method,
      url: fullUrl,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(contentType && { 'Content-Type': contentType }),
      },
      ...(typeof data === 'object' && data !== null ? { data } : {}),
    };

    const response = await axios(config);
    return { data: response.data, status: 'success' };
  } catch (err) {
    console.log('API Request login Error:', err);
    return handleError(err);
  }
}

// Specific functions using the common apiRequest
export async function AuthFetch(url: string, token: string | null | undefined) {
  return apiRequest({ url, method: 'get', token });
}

export async function AuthPost(url: string, body: any, token: string | null | undefined) {
  return apiRequest({ url, method: 'post', data: body, token });
}

export async function AuthPut(url: string, body: any, token: string | null | undefined) {
  return apiRequest({ url, method: 'put', data: body, token });
}

export async function UploadFiles(url: string, body: any, token: string | null | undefined) {
  return apiRequest({ 
    url, 
    method: 'post', 
    data: body, 
    token, 
    contentType: 'multipart/form-data' 
  });
}

export async function UsePost(url: string, body: any) {
  console.log("body",url, body)
  return apiRequest({ url, method: 'post', data: body });
}

export async function authDelete(
  url: string,
  body: any,
  token: string
) {
  return apiRequest({ url, method: 'delete', data: body, token });
}