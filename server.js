const express = require('express');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const multer = require('multer');

const PROFILE_IMG_DIR = 'U:/Producao/SJP/Engenharia de Processos/Desenhos e modelagem 3D/Projeto Luan/projects/profile';

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;

const upload = multer({
    dest: 'uploads/', // pasta temporária antes de mover
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ========= CONFIGURAÇÕES =========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ========= MIDDLEWARES =========
app.use(session({
    secret: 'aR8fT$#9zLkP0vY@jWq1uB7eNxMgXcZ2e3tUoR!4',
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========= DADOS =========
const projetosPath = path.join(__dirname, 'data', 'projetos.json');
const usuariosPath = path.join(__dirname, 'data', 'usuarios.json');

function carregarUsuarios() {
    if (!fs.existsSync(usuariosPath)) return [];
    const raw = fs.readFileSync(usuariosPath, 'utf-8');
    return JSON.parse(raw || '[]');
}

function salvarUsuarios(usuarios) {
    fs.writeFileSync(usuariosPath, JSON.stringify(usuarios, null, 2), 'utf-8');
}

function carregarProjetos() {
    if (!fs.existsSync(projetosPath)) return [];
    const raw = fs.readFileSync(projetosPath, 'utf-8');
    return JSON.parse(raw || '[]');
}

function salvarProjetos(projetos) {
    fs.writeFileSync(projetosPath, JSON.stringify(projetos, null, 2), 'utf-8');
}

function autenticar(req, res, next) {
    if (req.session && req.session.usuario) {
        next();
    } else {
        res.redirect('/login');
    }
}

function verificarImagemPerfil(usuario) {
    const avatarPath = path.join(__dirname, 'public', 'images', `${String(usuario.id).padStart(5, '0')}-avatar.jpg`);
    return fs.existsSync(avatarPath);
}

// ========= USUÁRIOS =========
let usuarios = carregarUsuarios();

app.use((req, res, next) => {
    if (req.session.usuario) {
        const usuario = usuarios.find(u => u.username === req.session.usuario.username);
        if (usuario) {
            usuario.temImagem = verificarImagemPerfil(usuario);
            res.locals.usuario = usuario;
        } else {
            res.locals.usuario = null;
        }
    } else {
        res.locals.usuario = null;
    }
    next();
});

// ========= ROTAS DE LOGIN =========
app.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/');
    }

    res.render('login', {
        title: 'Login',
        erro: null,
        layout: false
    });
});

const bcrypt = require('bcrypt');


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const usuarios = carregarUsuarios();

    const usuario = usuarios.find(u => u.username === username);

    // Caso 1: Usuário não encontrado
    if (!usuario) {
        return res.render('login', {
            title: 'Login',
            erro: 'Usuário não encontrado',
            layout: false
        });
    }

    // Caso 2: Senha ainda não definida
    if (!usuario.password || usuario.password.trim() === '') {
        req.session.usuarioTemp = {
            id: usuario.id,
            username: usuario.username,
            name: usuario.name ?? null,
            email: usuario.email ?? null,
            setor: usuario.setor ?? null
        };
        return res.redirect('/password');
    }

    // Caso 3: Senha incorreta
    const senhaCorreta = await bcrypt.compare(password, usuario.password);
    if (!senhaCorreta) {
        return res.render('login', {
            title: 'Login',
            erro: 'Senha incorreta',
            layout: false
        });
    }

    // Caso 4: Login bem-sucedido
    req.session.usuario = {
        id: usuario.id,
        username: usuario.username,
        name: usuario.name,
        setor: usuario.setor,
        role: usuario.role
    };

    return res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.get('/password', (req, res) => {
    if (!req.session.usuarioTemp) return res.redirect('/login');

    res.render('password', {
        title: 'Definir Senha',
        usuario: req.session.usuarioTemp
    });
});

app.post('/password', async (req, res) => {
    const { senha, confirmar } = req.body;

    if (!req.session.usuarioTemp) return res.redirect('/login');
    if (senha !== confirmar) return res.send('Senhas não coincidem.');

    const usuario = usuarios.find(u => u.username === req.session.usuarioTemp.username);
    if (!usuario) return res.redirect('/login');

    usuario.password = await bcrypt.hash(senha, 10);
    salvarUsuarios(usuarios);

    req.session.usuario = {
        id: usuario.id,
        username: usuario.username,
        name: usuario.name,
        role: usuario.role
    };
    delete req.session.usuarioTemp;

    res.redirect('/');
});

// ========= ROTAS DE PROJETOS =========
app.get('/', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    res.render('index', { title: 'Lista', projetos });
});

app.get('/create', autenticar, (req, res) => {
    res.render('create', { title: 'Criar Projeto' });
});

app.post('/projetos', autenticar, (req, res) => {
    const { nome, descricao, status, dataInicio, dataPrazo, dataConclusao, tarefas } = req.body;
    const projetos = carregarProjetos();

    const novoProjeto = {
        id: uuidv4(),
        nome,
        descricao,
        status,
        dataInicio,
        dataPrazo,
        dataConclusao,
        tarefas: Array.isArray(tarefas) ? tarefas.map(t => ({
            id: uuidv4(),
            titulo: t,
            concluida: false,
            descricao: '',
            status: '',
            dataInicio: '',
            dataPrazo: '',
            dataConclusao: '',
            subtarefas: []
        })) : []
    };

    projetos.push(novoProjeto);
    salvarProjetos(projetos);
    res.redirect('/');
});

app.post('/projetos/novo', autenticar, (req, res) => {
    const { nome } = req.body;
    const projetos = carregarProjetos();

    const novoProjeto = {
        id: uuidv4(),
        nome,
        descricao: '',
        status: '',
        dataInicio: '',
        dataPrazo: '',
        dataConclusao: '',
        tarefas: []
    };

    projetos.push(novoProjeto);
    salvarProjetos(projetos);
    res.json({ sucesso: true, id: novoProjeto.id, nome: novoProjeto.nome });
});

app.post('/projetos/:projId', autenticar, (req, res) => {
    const { campo, valor } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    if (!(campo in projeto)) return res.status(400).json({ error: 'Campo inválido' });

    projeto[campo] = valor;
    salvarProjetos(projetos);
    res.json(projeto);
});

app.delete('/projetos/:projId', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    const index = projetos.findIndex(p => p.id === req.params.projId);
    if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });

    projetos.splice(index, 1);
    salvarProjetos(projetos);
    res.json({ message: 'Projeto excluído com sucesso' });
});

// ========= ROTAS DE TAREFAS =========
app.post('/projetos/:projId/tarefas', autenticar, (req, res) => {
    const { nome } = req.body;
    if (!nome || nome.trim() === "") {
        return res.status(400).json({ error: "O título da tarefa não pode estar vazio" });
    }

    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });

    const novaTarefa = {
        id: uuidv4(),
        titulo: nome,
        concluida: false,
        descricao: '',
        status: '',
        dataInicio: '',
        dataPrazo: '',
        dataConclusao: '',
        subtarefas: []
    };

    projeto.tarefas.push(novaTarefa);
    salvarProjetos(projetos);
    res.json(novaTarefa);
});

app.post('/projetos/:projId/tarefas/:tarefaId', autenticar, (req, res) => {
    const { campo, valor } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    tarefa[campo] = valor;
    salvarProjetos(projetos);
    res.json({ sucesso: true });
});

app.delete('/projetos/:projId/tarefas/:tarefaId', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const index = projeto.tarefas.findIndex(t => t.id === req.params.tarefaId);
    if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

    projeto.tarefas.splice(index, 1);
    salvarProjetos(projetos);
    res.json({ message: 'Tarefa excluída com sucesso' });
});

// ========= ROTAS DE SUBTAREFAS =========
app.post('/projetos/:projId/tarefas/:tarefaId/subtarefas', autenticar, (req, res) => {
    const { titulo } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const novaSubtarefa = { id: uuidv4(), titulo, concluida: false };
    tarefa.subtarefas = tarefa.subtarefas || [];
    tarefa.subtarefas.push(novaSubtarefa);

    salvarProjetos(projetos);
    res.status(201).json(novaSubtarefa);
});

app.post('/projetos/:projId/tarefas/:tarefaId/subtarefas/:subtarefaId', autenticar, (req, res) => {
    const { titulo, concluida } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const subtarefa = tarefa.subtarefas?.find(st => st.id === req.params.subtarefaId);
    if (!subtarefa) return res.status(404).json({ error: 'Subtarefa não encontrada' });

    if (titulo !== undefined) subtarefa.titulo = titulo;
    if (concluida !== undefined) subtarefa.concluida = concluida;

    salvarProjetos(projetos);
    res.json({ message: 'Subtarefa atualizada com sucesso', subtarefa });
});

app.delete('/projetos/:projId/tarefas/:tarefaId/subtarefas/:subtarefaId', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const index = tarefa.subtarefas?.findIndex(st => st.id === req.params.subtarefaId);
    if (index === -1 || index === undefined) return res.status(404).json({ error: 'Subtarefa não encontrada' });

    tarefa.subtarefas.splice(index, 1);
    salvarProjetos(projetos);
    res.json({ message: 'Subtarefa excluída com sucesso' });
});

// ========= ROTAS DE PERFIL =========
app.get('/profile', autenticar, (req, res) => {
    const usuario = usuarios.find(u => u.username === req.session.usuario.username);
    res.render('editprofile', { title: 'Editar Perfil', usuario });
});

app.post('/profile', upload.single('profilePicture'), async (req, res) => {
    const { name, email, phone, setor, birthdate, newPassword, confirmPassword } = req.body;
    const usuario = usuarios.find(u => u.username === req.session.usuario.username);

    if (usuario) {
        usuario.name = name;
        usuario.email = email;
        usuario.phone = phone;
        usuario.setor = setor;
        usuario.birthdate = birthdate;

        // Se o usuário está tentando alterar a senha
        if (newPassword && confirmPassword && newPassword === confirmPassword) {
            try {
                const hashedPassword = await bcrypt.hash(confirmPassword, 10); // 10 é o custo do salt
                usuario.password = hashedPassword;
            } catch (err) {
                console.error('Erro ao gerar hash da senha:', err);
                return res.status(500).send('Erro ao salvar nova senha.');
            }
        }

        if (req.file) {
            const newPath = path.join(req.file.destination, `${String(usuario.id).padStart(5, '0')}-avatar.jpg`);
            fs.renameSync(req.file.path, newPath);
            usuario.temImagem = true;
        }

        salvarUsuarios(usuarios);
    }

    res.redirect('/profile');
});

// ========= CRIAÇÃO DO USUÁRIO =========
app.get('/createUser', (req, res) => {
    if (!req.session.usuario || req.session.usuario.role !== 'admin') {
        return res.status(403).send('Acesso negado');
    }

    res.render('createUser', {
        usuario: req.session.usuario,
        title: 'Criar Novo Usuário',
    });
});

app.post('/createUser', upload.single('imagem'), async (req, res) => {
    if (!req.session.usuario || req.session.usuario.role !== 'admin') {
        return res.status(403).send('Acesso negado');
    }

    const { name, username, email, phone, setor, birthdate, role } = req.body;
    const usuarios = carregarUsuarios();

    // Verifica se usuário já existe
    const existente = usuarios.find(u => u.username === username || u.email === email);
    if (existente) {
        return res.status(400).send('Usuário ou e-mail já cadastrado.');
    }

    // Cria novo usuário
    const novoUsuario = {
        id: uuidv4(),
        name,
        username,
        email,
        phone,
        setor,
        birthdate,
        role,
        password: '', // senha vazia até o primeiro login
        temImagem: false
    };

    // Salva imagem, se houver
    if (req.file) {
        const ext = path.extname(req.file.originalname);
        const imageName = `${String(novoUsuario.id).padStart(5, '0')}-avatar.jpg`;
        const newPath = path.join(__dirname, 'public', 'images', imageName);
        fs.renameSync(req.file.path, newPath);
        novoUsuario.temImagem = true;
    }

    // Salva no JSON
    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);

    res.redirect('/');
});

// ========= INICIAR SERVIDOR =========
io.on('connection', socket => {
    console.log('Novo usuário conectado');

    socket.on('projetoAtualizado', data => {
        // Reenvia o evento para todos os outros clientes
        socket.broadcast.emit('atualizarItem', data);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});