import axios from "axios";

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000',
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if(token) {
        config.headers['Authorization'] = 'Bearer ' + token;
        config.headers['token'] = token;
    }
    return config;
}, err => {
    return Promise.reject(err);
});

axiosInstance.interceptors.response.use(response => {
    return response;
}, err => {
    if(err.response.status === 401 || err.response.status === 403) {
        // 清除token并重定向到登录页面
        // localStorage.removeItem('token');
        // window.location.href = '/login';
    }
    return Promise.reject(err);
});

export default axiosInstance;