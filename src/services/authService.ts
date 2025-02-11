export const registerUser = async (formData) => {
    const response = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    return response.json();
  };
  
  export const loginUser = async (formData) => {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    return response.json();
  };
  
  export const getProfile = async (token) => {
    const response = await fetch("http://localhost:5000/api/auth/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  };
  