import axios from 'axios'
export const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
export const api = axios.create({ baseURL: API, timeout: 20000 })
api.interceptors.request.use(c => {
  const t = localStorage.getItem('token')
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})
// Expired or invalid login token: tell the app so it can sign the user out politely.
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401 && localStorage.getItem('token')) window.dispatchEvent(new Event('auth-expired'))
  return Promise.reject(e)
})
export const errMsg = e => {
  if (e?.response?.data?.message) return e.response.data.message
  if (e?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
  if (e?.request && !e?.response) return "Can't reach the server. Make sure the backend is running."
  return e?.message || 'Something went wrong'
}
