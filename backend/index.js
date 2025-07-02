const express = require('express');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('bson');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const ws = require('ws');
const multer = require('multer');
const authenticateToken = require('./authenticateToken');
const jwt = require('jsonwebtoken');
const jwtSecret = 'adad1dqd231e1e13y5tt213';
const upload = multer({
  dest: '/uploads',
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB 限制
  },
});

async function DatabaseConnection() {
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    try {
        await client.connect();
        database = await client.db('UserInfo');
        return database;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

async function MessageDataConnection() {
    const url = 'mongodb://localhost:27017';
    const client = new MongoClient(url);
    try {
        await client.connect();
        database = await client.db('MessageInfo');
        return database;
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

const app = express();

app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173', 
}));
app.use(express.json());
app.use(cookieParser());
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));

app.get('/profile', authenticateToken, async (req, res) => {
    res.json(req.user);
})

app.get('/avatar', authenticateToken, async (req, res) => {
    const { userId } = req.query;
    const _id = new ObjectId(userId);
    try {
        const database = await DatabaseConnection();
        if(!database) return res.status(500).json('连接数据库失败');
        const { avatarUrl } = await database.collection('Information').findOne({_id});
        if(!avatarUrl) return res.status(405).json('用户没有头像');
        return res.json({
            success: true,
            avatarUrl,
        });
    } catch(err) {
        console.error(err)
    }
})

app.post('/avatar', upload.single('avatar'), authenticateToken, async (req, res) => {
    const { userId } = req.body;
    const _id = new ObjectId(userId);
    const file = req.file;
    try {
        const database = await DatabaseConnection();
        if(!database) return res.status(500).json('数据库连接失败');
        const name = await database.collection('Information').findOne({_id});
        if(!name) return res.status(403).json('用户不存在');
        const fileExt = path.extname(file.originalname);
        const fileName = `${userId}_${Date.now()}${fileExt}`;
        const filePath = path.join('public', 'avatars', fileName);
        const fileUrl = `http://localhost:3000/avatars/${fileName}`; // 前端访问URL
        const fs = require('fs').promises;
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.rename(file.path, filePath);
        if(name.avatarFileName) {
            const oldFilePath = path.join('public', 'avatars', name.avatarFileName);
            try {
                await fs.access(oldFilePath);
                await fs.unlink(oldFilePath);
                console.log('删除成功');
            } catch(err) {
                console.warn('删除头像失败');
            }
        }
        await database.collection('Information').updateOne(
        { _id },
        { $set: { avatarUrl: fileUrl } },
        { avatarFileName: fileName }
    );
    res.json({
      success: true,
      data: {
        url: fileUrl
      }
    });
    } catch (error) {
        console.error('上传失败:', error);
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const database = await DatabaseConnection();
        if(!database) return res.status(500).json('数据库连接失败');
        const name = await database.collection('Information').findOne({username});
        if(!name) return res.status(403).json('用户不存在');
        const user = await database.collection('Information').findOne({username, password});
        if(!user) return res.status(401).json('用户名或密码错误');
        jwt.sign({userId: user._id, username, password}, jwtSecret, (err, token) => {
            if(err) throw err;
            return res.cookie('token', token,  {
            sameSite: 'lax',
            secure: false,
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        }).status(201).json({
                id: user._id,
                token,
            });
        });
    } catch (error) {
        console.error('登录失败:', error);
    }
})

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if(!username || !password) {
        return res.status(400).json('参数不完整');
    }
    try {
        const database = await DatabaseConnection();
        if(!database) return res.status(500).json('数据库连接失败'); 
        else console.log('数据库连接成功');
        const existingUser = await database.collection('Information').findOne({username});
        if(existingUser) return res.status(409).json('用户名已存在');
        const createUser = await database.collection('Information').insertOne({
            username,
            password
        });
        jwt.sign({userId: createUser.insertedId, username, password}, jwtSecret, (err, token) => {
            if(err) throw err;
            return res.cookie('token', token, {sameSite: 'none', secure: true}).status(201).json({
                id: createUser.insertedId,
                username,
                token,
            });
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json('注册失败');
    }
})

app.get('/messages', authenticateToken, async (req, res) => {
    const { from, to } = req.query;
    const database = await MessageDataConnection();
    const collection = database.collection('Message');
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    //双向查询
    const messages = await collection.find({
        $or: [
            { sender: from, recipient: to },
            { sender: to, recipient: from }
        ],
        SendTime: { $gte: fortyEightHoursAgo },
    }).sort({ SendTime: 1 }).toArray(); 
    if(!messages || !messages.length) return res.status(404).json('该用户已下线');
    res.json(messages);
})

app.get('/people', authenticateToken, async (_, res) => {
    const database = await DatabaseConnection();
    if(!database) return res.status(500).json('数据库连接失败');
    const collection = database.collection('Information');
    const users = await collection.find({}, { projection: { _id: 1, username: 1, avatarUrl: 1 } }).toArray();
    res.json(users);
})


const server = app.listen(3000);


const wss = new ws.WebSocketServer({ 
    server, 
    maxPayload: 1024 * 1024 * 10 // 限制最大消息大小为10MB
});
const clients = new Map(); // 使用 Map 存储用户信息，快速查找

// 初始化连接处理
wss.on('connection', (connection, req) => {
    try {
        // 提取和验证 token
        const token = req.headers.cookie.split(';')[1].split('=')[1];
        if (!token) return connection.close(1008, 'Authentication failed');
        jwt.verify(token, jwtSecret, (err, userData) => {
            if (err) return connection.close(1008, 'Invalid token');
            const { userId, username } = userData;
            connection.userId = userId;
            connection.username = username;
            // 将用户添加到在线列表
            clients.set(userId, {
                connection,
                username,
                lastSeen: Date.now()
            });
            // 通知所有用户有新用户上线
            broadcastOnlineUsers();
            // 设置心跳检测
            setupHeartbeat(connection, userId);
        });
        connection.on('message', async (msg) => {
            const messageData = JSON.parse(msg.toString())
            console.log('这是新的消息', messageData)
            const { recipient, sender, text, image, file, fileName, voice } = messageData;
            if(!text && !image && !file && !voice) return ;
            const database = await MessageDataConnection();
            const collection = database.collection('Message');
            const SendTime = new Date();
            const messageDataToInsert = {
                sender,
                recipient,
                SendTime,
            };
            if (text) messageDataToInsert.text = text;
            if (image) messageDataToInsert.image = image;
            if (file) messageDataToInsert.file = file;
            if(voice) messageDataToInsert.voice = voice;
            if(fileName) messageDataToInsert.fileName = fileName;
            const result = await collection.insertOne(messageDataToInsert);
            const receiver = clients.get(recipient);
            if(!receiver) return;
            const messageToRecipient = {
                sender,
                recipient,
                _id: result.insertedId,
                SendTime,
            }
            if(text) messageToRecipient.text = text;
            if(image) messageToRecipient.image = image;
            if(file) messageToRecipient.file = file;
            if(fileName) messageToRecipient.fileName = fileName;
            if(voice) messageToRecipient.voice = voice;
            receiver.connection.send(JSON.stringify(messageToRecipient))
        });
    } catch (error) {
        console.error('Connection error:', error);
        connection.close(1011, 'Internal server error');
    }
});

// 广播在线用户列表
function broadcastOnlineUsers() {
    // 获取所有在线用户，并添加头像URL信息
    const onlineUsers = Array.from(clients.entries())
        .filter(([_, client]) => client.connection.isAlive !== false)
        .map(async ([userId, client]) => {
            // 尝试从数据库获取用户头像
            let avatarUrl = null;
            try {
                const database = await DatabaseConnection();
                if (database) {
                    const user = await database.collection('Information').findOne({
                        _id: new ObjectId(userId)
                    });
                    if (user && user.avatarUrl) {
                        avatarUrl = user.avatarUrl;
                    }
                }
            } catch (error) {
                console.error('获取用户头像失败:', error);
            }
            return {
                userId,
                username: client.username,
                avatarUrl,
                lastSeen: client.lastSeen
            };
        });
    
    // 使用Promise.all处理异步操作
    Promise.all(onlineUsers).then(users => {
        const payload = JSON.stringify(users);
        // 向所有连接的客户端广播
        wss.clients.forEach(client => {
            if (client.readyState === ws.OPEN) {
                client.send(payload);
            }
        });
    });
}


// 设置心跳检测
function setupHeartbeat(connection, userId) {
    connection.isAlive = true;
    // 定期发送 ping
    const pingInterval = setInterval(() => {
        if (!connection.isAlive) {
            removeUser(userId);
            return clearInterval(pingInterval);
        }
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            removeUser(userId);
        }, 2000);
    }, 30000); // 30秒检查一次，比原来的2分钟更频繁
    // 处理 pong 响应
    connection.on('pong', () => {
        connection.isAlive = true;
        clearTimeout(connection.deathTimer);
    });
    // 连接关闭时清理
    connection.on('close', () => {
        clearInterval(pingInterval);
        clearTimeout(connection.deathTimer);
        removeUser(userId);
    });
    // 错误处理
    connection.on('error', (err) => {
        console.error(`WebSocket error for user ${userId}:`, err);
        removeUser(userId);
    });
}

// 移除用户并通知
function removeUser(userId) {
    if (clients.has(userId)) {
        clients.get(userId)?.connection?.terminate();
        clients.delete(userId);
        broadcastOnlineUsers();
    }
}

async function cleanupOldMessages() {
    try {
        const database = await MessageDataConnection();
        if (!database) {
            console.error('清理旧消息时连接数据库失败');
            return;
        }
        const collection = database.collection('Message');
        // 计算48小时前的时间戳
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
        // 删除48小时前的消息
        const result = await collection.deleteMany({
            SendTime: { $lt: fortyEightHoursAgo }
        });
        console.log(`已清理 ${result.deletedCount} 条48小时前的聊天记录`);
    } catch (error) {
        console.error('清理旧消息时出错:', error);
    }
}

// 每天执行一次清理操作
setInterval(cleanupOldMessages, 24 * 60 * 60 * 1000);

// 服务器启动时也执行一次清理
cleanupOldMessages().catch(err => console.error('初始清理消息失败:', err));