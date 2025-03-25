export const registerUser = async (formData: any) => {
  const response = await fetch("http://localhost:5001/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
};

export const loginUser = async (formData: any) => {
  const response = await fetch("http://localhost:5001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
};

export const getProfile = async (token: string) => {
  const response = await fetch("http://localhost:5001/api/auth/profile", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};


export const forgotPasswordRequest = async (formData:any) => {
  const response = await fetch("http://localhost:5001/api/auth/forgot-password-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
};

export const resetPassword = async (formData:any) => {
  const response = await fetch("http://localhost:5001/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
};
