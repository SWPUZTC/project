const jwtSecret = 'adad1dqd231e1e13y5tt213';
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    // 1. 从请求头中获取 Authorization 字段
    // 通常格式是 "Bearer YOUR_TOKEN_HERE"
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // 获取 "Bearer " 后面的 token
    // 2. 如果 Authorization 头不存在或者 token 为空，则表示未提供 token
    if (!token) {
        // 如果您同时通过 Cookie 传递 token，也可以在这里检查 req.cookies.token
        const cookieToken = req.cookies.token;
        if (cookieToken) {
            token = cookieToken; // 如果 Cookie 中有 token，使用 Cookie 中的 token
        } else {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }
    }
    // 3. 验证 token
    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            // token 验证失败：可能过期，无效签名，或其他 jwt 错误
            console.error('JWT verification error:', err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Unauthorized: Token expired' });
            } else if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ message: 'Forbidden: Invalid token' });
            } else {
                return res.status(403).json({ message: 'Forbidden: Authentication failed' });
            }
        }
        // 如果 token 有效，将解码后的用户数据存储在 req 对象上，以便后续路由访问
        req.user = user; 
        next(); // 调用 next() 将控制权传递给下一个中间件或路由处理程序
    });
};
module.exports = authenticateToken;